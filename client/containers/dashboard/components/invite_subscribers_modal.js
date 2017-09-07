import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactCrop from 'react-image-crop';
import axios from 'axios';
import firebase from 'firebase';

import {minLengthValidator, maxLengthValidator} from '../../../helpers/validators';
import {inviteListeners} from '../../../helpers/invite_listeners';

import ValidatedInput from '../../../components/inputs/validatedInput';
import Colors from '../../../styles/colors';
import { OrangeSubmitButton, TransparentShortSubmitButton } from '../../../components/buttons/buttons';

export default class InviteSubscribersModal extends Component {
  constructor(props) {
    super(props);
    this.state={
      inviteeList: '',
      submitted: false
    }

    this.closeModal = this.closeModal.bind(this);
    this.inviteListeners = this.inviteListeners.bind(this);
  }

  inviteListeners() {
    const inviteeArr = this.state.inviteeList.split(',');

    const { soundcast, userInfo } = this.props;

    for(var i = inviteeArr.length -1; i >= 0; i--) {
        if (inviteeArr[i].indexOf('@') == -1) {
            inviteeArr.splice(i, 1);
        }
    }

    // send email invitations to invited listeners
    inviteListeners(inviteeArr, soundcast.title, userInfo.firstName, userInfo.lastName);

    inviteeArr.forEach(email => {
        const _email = email.replace(/\./g, "(dot)");
        if(_email) {
          firebase.database().ref(`soundcasts/${this.props.soundcast.id}/invited/${_email}`).set(true);
          //invited listeners are different from subscribers. Subscribers are invited listeners who've accepted the invitation and signed up via mobile app
          firebase.database().ref(`invitations/${_email}/${this.props.soundcast.id}`).set(true);
        }
    });
    this.setState({
      submitted: true
    });
  }

  closeModal() {
    this.setState({
      submitted: false
    });

    this.props.onClose();
  }

  render() {
    const { soundcast, userInfo } = this.props;

    if(!this.props.isShown) {
      return null;
    }

    if(this.state.submitted) {
      return (
      <div>
        <div
          style={styles.backDrop}
          onClick={this.closeModal}>
        </div>
        <div style={styles.modal}>
          <div className='title-medium'
            style={styles.successText}>
            Your invitee list has been submitted
          </div>
          <div style={styles.successButtonWrap}>
              <div
                  style={{...styles.button}}
                  onClick={this.closeModal}>
                  Close
              </div>
          </div>
        </div>
      </div>
      )
    }

    return (
      <div>
        <div
          style={styles.backDrop}
          onClick={this.closeModal}>
        </div>
        <div style={styles.modal}>
          <div style={styles.titleText}>
            <div
              className='title-medium'>
                {`Invite subscribers to ${soundcast.title}`}
            </div>
          </div>
          <textarea
              style={styles.inputDescription}
              placeholder={'Enter listener email addresses, separated by commas'}
              onChange={(e) => {this.setState({inviteeList: e.target.value})}}
              value={this.state.subscribers}
          >
          </textarea>
          <div style={styles.buttonsWrap}>
            <div
                style={{...styles.button, ...styles.submitButton}}
                onClick={this.inviteListeners}>
                Submit
            </div>
            <div
                style={styles.button}
                onClick={this.closeModal}>
                Cancel
            </div>
          </div>
        </div>
      </div>
    )
  }
}

const styles = {
  backDrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: '0px',
    left: '0px',
    zIndex: '9998',
    background: 'rgba(0, 0, 0, 0.3)'
  },
  modal: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: '60%',
    height: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '9999',
    background: '#fff'
  },
  successText:{
    height: '50%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  successButtonWrap: {
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleText: {
    marginTop: 30,
    marginBottom: 20,
    marginLeft: 20
  },
  inputDescription: {
    height: '50%',
    width: '90%',
    paddingLeft: 20,
    marginLeft: 20,
    // padding: '10px 10px',
    fontSize: 16,
    borderRadius: 4,

  },
  buttonsWrap: {
  },
  button: {
    height: 35,
    display: 'inline-block',
    float: 'right',
    borderRadius: 23,
    overflow: 'hidden',
    // margin: '40px auto',
    fontSize: 14,
    letterSpacing: 2.5,
    wordSpacing: 5,
    marginRight: 20,
    paddingTop: 6,
    paddingRight: 20,
    paddingBottom: 4,
    paddingLeft: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: Colors.darkGrey,
    borderColor: Colors.darkGrey,
  },
  submitButton: {
    backgroundColor: Colors.mainOrange,
    color: Colors.mainWhite,
    borderColor: Colors.mainOrange
  }
}