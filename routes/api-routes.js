
const Tournament = require('../models/tournament-model')
const Race = require('../models/race-model')
const eloCalcs = require('../helpers/elo-calculations')
const sorting = require('../helpers/sorting')
const COMP_INITIAL_SCORE = -200
const PLAYER_INITIAL_SCORE = 200

function makeTournamentCode() {
  var code = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 10; i++)
    code += possible.charAt(Math.floor(Math.random() * possible.length));

  return code;
}

function getCodeFromQueryString(query, param) {
  const vars = query.split('&')
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split('=')
    if (decodeURIComponent(pair[0]) == param) {
      return decodeURIComponent(pair[1])
    }
  }
}

function verifyName(name) {
  if (name.length > 16) return false
  if (name.match(/^[a-z0-9\s]+$/i) === null) return false
  return true
}

function addNewScoresToTournament(tournamentCode, scoreHistory, raceCounter, res) {
  // TODO: Update tournament first, get the race number, then create the race instance
  // TODO: Can I make this synchronous???
  Tournament.findOneAndUpdate(
    { code: tournamentCode },
    { $set: { raceCounter, scoreHistory }},
    {new: true},
    (err, tournament) => {
      if (err) {
        res.json({ error: err })
      } else {
        Race.find({ tournament: tournamentCode }, (err, races) => {
          res.json({ tournament, races })
        })
      }
    }
  )
}

function recalculateScores(code, res) {
  // get all races younger than the deleted race
  Race.find({ tournament: code }, (err, races) => { // TODO: query that finds younger races
    // sort races by race date
    races.sort(sorting.compareRace)

    Tournament.findOne({ code: code }, (err, tournament) => {
      // Delete score history. TODO: Change this so that it only re-calculates the
      // necessary part of the score history.
      tournament.scoreHistory.forEach(playerHistory => {
        if (playerHistory.name.charAt(0) === '_') {
          playerHistory.scores = { "0": COMP_INITIAL_SCORE }
        } else {
          playerHistory.scores = { "0": PLAYER_INITIAL_SCORE }
        }
      })
      // Reset race counter
      tournament.raceCounter = 0

      for (let i = 0; i < races.length; i++) {
        tournament.scoreHistory = eloCalcs.getUpdatedScoreHistory(tournament, races[i].places[0])
        tournament.raceCounter += 1
      }
      addNewScoresToTournament(code, tournament.scoreHistory, tournament.raceCounter, res)
    })
  })
}

module.exports = (app, jsonParser) => {
  app.get('/api/profile', (req, res) => {
    if (req.user) {
      res.json({
        user: req.user,
      })
    } else {
      res.json({
        error: 'User is not logged in'
      })
    }
  })

  app.post('/api/new-tournament', jsonParser, (req, res) => {
    if (req.user) {
      if (verifyName(req.body.name)) {
        const code = makeTournamentCode()
        const scoreHistory = [{
          name: "_comp",
          scores: { "0": COMP_INITIAL_SCORE }
        }]
        new Tournament({
          name: req.body.name,
          adminUsers: req.user.email,
          code,
          raceCounter: 0,
          scoreHistory
        }).save().then(() => {
          res.json({ success: true })
        })
      } else {
        res.json({ success: false, error: "Name is not valid"})
      }
    } else {
      res.json({
        success: false,
        error: 'user is not logged in'
      })
    }
  })

  app.get('/api/get-tournaments', (req, res) => {
    if (req.user) {
      Tournament.find({ adminUsers: req.user.email }).then(tournaments => {
        res.json({ tournaments })
      })
    } else {
      res.json({
        error: 'user is not logged in'
      })
    }
  })

  app.get('/api/get-races', (req, res) => {
    const query = req._parsedUrl.query
    const code = getCodeFromQueryString(query, 'code')
    if (code === undefined) {
      res.json({ error: "Tournament not found" })
    } else {
      Race.find({ tournament: code }).then((races) => {
        if (races === null) {
          res.json({ error: "No races found"})
        } else {
          const page = getCodeFromQueryString(query, 'page')
          const pageLength = 10
          const length = races.length
          let startIndex = length - page * pageLength
          let endIndex = startIndex + 10
          if (endIndex < 0) {
            res.json({ error: "No more races to load" })
          } else {
            startIndex = startIndex < 0 ? 0 : startIndex
            races = races.slice(startIndex, endIndex)
            res.json({ races })
          }
        }
      })
    }
  })

  app.get('/api/get-tournament-data', (req, res) => {
    const query = req._parsedUrl.query
    const code = getCodeFromQueryString(query, 'code')
    if (code === undefined) {
      res.json({ error: 'Tournament not found' })
    } else {
      Tournament.findOne({ code: code })
      .then(tournament => {
        if (tournament === null) {
          res.json({ error: 'Tournament not found' })
        } else {
          res.json({ tournament })
        }
      })
    }
  })

  app.post('/api/join-tournament', jsonParser, (req, res) => {
    if (req.user) {
      Tournament.findOneAndUpdate(
        { code: req.body.code },
        {$addToSet: { adminUsers: req.user.email }}
      ).then((tournament) => {
        if (tournament !== null) {
          res.json({ success: true })
        } else {
          res.json({success: false})
        }
      })
    } else {
      res.json({
        error: 'User is not logged in'
      })
    }
  })

  app.post('/api/add-player', jsonParser, (req, res) => {
    if (req.user) {
      if (verifyName(req.body.name)) {
        const scoreHistoryObject = {
          name: req.body.name,
          scores: { "0": PLAYER_INITIAL_SCORE }
        }
        Tournament.findOne(
          { code: req.body.code, adminUsers: req.user.email },
          (err, tournament) => {
            if (err) {
              res.json({ error: "error adding player" })
            } else {
              let { scoreHistory } = tournament
              scoreHistory.push(scoreHistoryObject)
              scoreHistory.sort(sorting.comparePlayerNames)
              Tournament.findOneAndUpdate(
                { code: req.body.code, adminUsers: req.user.email },
                { $set: { scoreHistory: scoreHistory }},
                {new: true},
                (err, tournament) => {
                  if (err) {
                    res.json({ error: "error adding player" })
                  } else {
                    res.json(tournament)
                  }
                }
              )
            }
          }
        )
      } else {
        res.json({ error: "Player name is not valid." })
      }
    } else {
      req.json({ error: "You must be logged in to add players. "})
    }
  })

  app.post('/api/add-race', jsonParser, (req, res) => {
    if (req.user) {
      const date = new Date()
      const places = req.body.places
      const tournamentCode = req.body.code

      // Make sure they haven't added a computer player
      if (Object.keys(places).includes("_comp")) {
        res.json({ error: "Player not in tournament" })
        return
      }

      new Race({
        user: req.user.email,
        tournament: tournamentCode,
        places,
        date
      }).save().then(() => {
        Tournament.findOne({ code: tournamentCode }, (err, tournament) => {
          const raceCounter = tournament.raceCounter + 1
          const scoreHistory = eloCalcs.getUpdatedScoreHistory(tournament, places)
          addNewScoresToTournament(tournament.code, scoreHistory, raceCounter, res)
        })
      }).catch(err => console.log(err))
    }
  })

  app.post('/api/delete-race', jsonParser, (req, res) => {
    if (req.user) {
      const { raceID, tournamentCode } = req.body
      // Make sure user is an admin of tournament
      Tournament.findOne({ code: tournamentCode, adminUsers: req.user.email }, (err, tournament) => {
        if (tournament) {
          // delete race
          Race.findOneAndDelete({ _id: raceID, tournament: tournamentCode }, (err, race) => {
            if (race !== null) recalculateScores(tournamentCode, res)
          })
        } else {
          res.json({error: "User is not an admin of this tournament."})
        }
      })
    } else {
      res.json({ error: "User is not logged in."})
    }
  })
}

