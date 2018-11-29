import React, { Component } from 'react'
import { withStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import CircularProgress from '@material-ui/core/CircularProgress'

import TournamentHeader from '../Components/TournamentHeader'
import TournamentData from '../Components/TournamentData'
import { comparePos, compareRaces, comparePlayerScores } from '../helpers'

const styles = theme => ({
  text: {
    margin: '20px'
  },
  error: {
    color: '#990000'
  },
  progress: {
    margin: theme.spacing.unit * 2,
  },
})

class TournamentPage extends Component {
  constructor(props) {
    super(props)
    this.addPlayerCallback = this.addPlayerCallback.bind(this)
    this.updatedTournamentCallback = this.updatedTournamentCallback.bind(this)
    this.updatedRacesCallback = this.updatedRacesCallback.bind(this)

    this.state = {
      error: "",
      tournament: {},
      parsedData: null,
      races: [],
      playerScores: [],
      loading: true,
    }
  }

  componentWillMount() {
    this.getTournamentData()
  }

  getCurrentScores(tournament) {
    if (tournament !== null) {
      const { scoreHistory } = tournament
      let currentScores = []
      for (let i = 0; i < scoreHistory.length; i++) {
        const player = scoreHistory[i].name
        if (player.charAt(0) !== '_') {
          let j = tournament.raceCounter
          let score
          while (score === undefined && j >= 0) {
            if (scoreHistory[i].scores[j]) score = scoreHistory[i].scores[j]
            j -= 1
          }
          currentScores.push([player, score.toFixed()])
        }
      }
      currentScores.sort(comparePlayerScores)
      return currentScores
    } else {
      return 0
    }
  }

  async getTournamentData() {
    this.setState({ loading: true })
    try {
      const params = this.props.location.search
      const res = await fetch(`/api/get-tournament-data${params}`)
      const resData = await res.json()
      const tournament = resData.tournament

      // get players and current scores
      const playerScores = this.getCurrentScores(tournament)

      // parse the tournament data for the chart
      const parsedData = this.parseTournament(tournament, playerScores)

      this.setState({
        tournament,
        playerScores,
        parsedData,
        loading: false,
        error: ""
      })
    } catch (err) {
      this.setState({
        error: "Error loading data",
        loading: false
      })
    }
  }
 
  parseTournament(tournament, playerScores) {
    if (tournament && tournament.length !== {}) {
      let values = [["Race"]]
      const scoreHistory = tournament.scoreHistory

      // Add a column for each race
      for (let i = 0; i <= tournament.raceCounter; i++) {
        values.push([i.toString()])
      }

      // Add scores for each player
      if (!playerScores) playerScores = this.state.playerScores
      playerScores.forEach(playerScore => {
        const index = scoreHistory.findIndex(x =>
          x.name === playerScore[0]
        )
        const player = scoreHistory[index]
        if (player !== "_comp") {
          values[0].push(player)
          let lastResult = 0
          for (let i = 1; i < values.length; i++) {
            if (player.scores.hasOwnProperty(values[i][0].toString())) {
              lastResult = player.scores[values[i][0].toString()]
            }
            values[i].push(lastResult)
          }
        }
      })
      return values
    }
  }

  parseRaces(races) {
    for (let i = 0; i < races.length; i++) {
      const places = races[i].places[0]
      let parsedPlaces = []
      Object.keys(places).forEach(name => {
        parsedPlaces.push({
          name: name,
          position: places[name]
        })
      })
      parsedPlaces.sort(comparePos)
      races[i].places = parsedPlaces
    }
    return races.sort(compareRaces)
  }

  updatedTournamentCallback(tournament) {
    const parsedData = this.parseTournament(tournament)
    this.setState({
      tournament,
      parsedData,
    })
  }

  updatedRacesCallback(races, page) {
    const parsedRaces = this.parseRaces(races)
    if (page && page > 1) {
      let existingRaces = this.state.races
      existingRaces.push.apply(existingRaces, parsedRaces)
      this.setState({
        races: existingRaces
      })
    } else {
      this.setState({
        races: parsedRaces
      })
    }
  }

  addPlayerCallback(tournament) {
    const players = tournament.scoreHistory.map((player) => (
      player.name
    ))
    // remove computer player
    const indexOfCompPlayer = players.indexOf("_comp")
    players.splice(indexOfCompPlayer, 1)

    const parsedData = this.parseTournament(tournament)
    const playerScores = this.getCurrentScores(players, parsedData)

    this.setState({
      tournament,
      parsedData,
      playerScores
    })
  }

  render() {
    const { classes, location } = this.props
    const { tournament, parsedData, races, playerScores, loading, error } = this.state
    const tournamentExists = tournament !== undefined && Object.keys(tournament).length > 0

    return (
      <div>
      {loading ?
        <div><CircularProgress className={classes.progress} /></div> :
        <div>
        {error !== "" && <Typography className={[classes.text, classes.error]}>{error}</Typography>}
        {!tournamentExists ?
          <div>
            <Typography variant='h5' className={classes.text}>Tournament Not Found</Typography>
          </div> :
          <div>
            <TournamentHeader name={tournament.name} code={tournament.code} />
            <TournamentData
              playerScores={playerScores}
              parsedData={parsedData}
              races={races}
              updatedTournamentCallback={this.updatedTournamentCallback}
              updatedRacesCallback={this.updatedRacesCallback}
              addPlayerCallback={this.addPlayerCallback}
              location={location}
            />
          </div>
        }
        </div>
        }
      </div>
    )
  }
}

export default withStyles(styles)(TournamentPage)

