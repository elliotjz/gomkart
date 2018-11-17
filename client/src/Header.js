import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';

const styles = {
  root: {
    flexGrow: 1,
  },
  grow: {
    flexGrow: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  row: {
    display: 'flex',
    justifyContent: 'center',
  },
  avatar: {
    margin: 10,
  },
};

function Header(props) {
  const { classes } = props;
  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" color="inherit" className={classes.grow}>
            GOM KART
          </Typography>
          {/*props.isSignedIn ?
            <div className={classes.row}>
                <Avatar
                    alt={props.user.displayName}
                    src={props.user.photoURL}
                    className={classes.avatar}
                />
                <Button color="inherit" onClick={props.logoutClick}>Logout</Button>
            </div>
            :
            null
          */}
        </Toolbar>
      </AppBar>
    </div>
  );
}

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  isSignedIn: PropTypes.bool.isRequired,
  logoutClick: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
};

export default withStyles(styles)(Header);