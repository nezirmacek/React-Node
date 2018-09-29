import React, { Component } from 'react';
import firebase from 'firebase';
import { RadioGroup, Radio} from 'react-radio-group';
import Axios from 'axios';

import Colors from '../../../styles/colors';
import commonStyles from '../../../styles/commonStyles';
import {
  OrangeSubmitButton,
} from '../../../components/buttons/buttons';
import Spinner from 'react-activity/lib/Spinner';

class SoundCastsDropDown extends Component {

  constructor(props) {
    super(props)
  }

  render() {
    const {
      currentSoundcastID,
    } = this.props;

  return (
          <div style={{display: 'flex'}}>
            <span style={{ 
                      padding: '10px 10px 10px 0px', 
                      width: '140px',
                      marginRight: '16'}}
            >
              Export
            </span>
            <div style={{ display: 'flex', flexGrow: 1 }} className="dropdown">
              <select
                style={styles.soundcastSelect}
                value={currentSoundcastID}
                onChange={e => {
                  this.props.changeSoundcastId(e);
                }}
              >
                {this.props.soundcasts.map((souncast, i) => {
                  return (
                    <option style={styles.option} value={souncast.id} key={i}>
                      {souncast.title}
                    </option>
                  );
                })}
              </select>
            </div>
            <span style={{padding: '10px'}}> Subscribers </span>
          </div>
        )
  }
}


class EmailListDropDown extends Component {

  constructor(props) {
    super(props)
  }

  render() {
  return (
          <div style={{display: 'flex'}}>
            <span style={{ 
                      padding: '10px 10px 10px 0px', 
                      width: '100px',
                      marginRight: '16'}}
            >
              to
            </span>
            <div style={{ display: 'flex', flexGrow: 1 }} className="dropdown">
              <select
                style={styles.soundcastSelect}
                value={"MailChimp"}
              >
                <option style={styles.option} value={"MailChimp"}>
                  MailChimp
                </option>
              </select>
            </div>
          </div>
        )
  }
}

class MailChimpLists extends Component {

  render() {
    return (
      <div>
        <div>
          Email List to subscribe to:
        </div>
        <div style={{margin: '10px 20px 20px 20px'}}>
          <div>
            <strong>
              List Name (ID)
            </strong>
          </div>
          <RadioGroup
            name="soundcasts"
            selectedValue={this.props.selectedListId}
            onChange={this.props.handleSelectList}
          >
            {
              this.props.list.map(item => {
                return (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 'normal',
                    }}
                  >
                    <Radio
                      style={{ width: 50 }}
                      value={item.id}
                    />
                    {`${item.name} (${item.id})`}
                  </label>
                )
              })
            }
          </RadioGroup>
        </div>
      </div>
    )  
  }
}


export default class EmailListModal extends Component {
  constructor(props) {
    super(props);
    this.closeModal = this.closeModal.bind(this);
    this.exportSubscribers = this.exportSubscribers.bind(this);
    this.saveSubscribersToMailChimp = this.saveSubscribersToMailChimp.bind(this);
    this.changeSoundcastId = this.changeSoundcastId.bind(this)
    this.setStateCurrentSoundCastID = this.setStateCurrentSoundCastID.bind(this);
    this.retrieveMailChimpKey = this.retrieveMailChimpKey.bind(this);
    this.handleSelectList = this.handleSelectList.bind(this);
    this.renderProgressBar = this.renderProgressBar.bind(this);

    //Have to intialize the id to the first soundcast. In componentDidMount &
    //componentDidUpdate
    this.state = {
      currentSoundcastID : null,
      currentSoundcast : {},
      selectedListId: '',
      list: [],
      apiKey: '',
      updatingList: false,
      exportInProgress : false,
    }

  }

  componentDidMount() {

    if(typeof this.props.userInfo.id != 'undefined') {
      this.setStateCurrentSoundCastID(this.props.userInfo)
      this.retrieveMailChimpKey(this.props.userInfo)
    } 
  }

  componentDidUpdate(prevProps) {

    if (typeof this.props.userInfo.id != 'undefined') {
      if (typeof prevProps.userInfo.id == 'undefined') {
        if (prevProps.userInfo.id != this.props.userInfo.id) {
          this.setStateCurrentSoundCastID(this.props.userInfo)
          this.retrieveMailChimpKey(this.props.userInfo)
        }
      } 
    } 
    //For the case on a reload when the prevProps.userInfo.id cannot be tested.
    if (this.state.currentSoundcastID === null && this.props.currentSoundcastID) {
      this.setStateCurrentSoundCastID(this.props.userInfo)
      this.retrieveMailChimpKey(this.props.userInfo)
    }

    //For the case when the user updates the soundcast on the subscriber screen
    //So we start the modal with the appropriate soundcast.
    if (prevProps.currentSoundcastID != this.props.currentSoundcastID) {
      this.setStateCurrentSoundCastID(this.props.userInfo)
      this.retrieveMailChimpKey(this.props.userInfo)
    }
  }

  setStateCurrentSoundCastID(userInfo) {
    if (userInfo.soundcasts_managed && 
      typeof Object.values(userInfo.soundcasts_managed)[0] == 'object') {

        if (this.props.currentSoundcastID != null) {
          //Now lets get the mailChimpID if it exists.

          let currentSc = userInfo.soundcasts_managed[this.props.currentSoundcastID];
          let mailChimpId = currentSc.mailChimpId ? currentSc.mailChimpId : '';

          this.setState({
            currentSoundcastID: this.props.currentSoundcastID,
            selectedListId: mailChimpId
          })  
        } 

    }
  }

  closeModal() {
    this.props.onClose(); 
  }

  exportSubscribers() {
     //Send request to firebase to update the list id in the soundcast
     //Send request to server to export the users and update mail chimp list
    if (!this.state.exportInProgress) {
      this.setState({exportInProgress : true}, this.saveSubscribersToMailChimp)
    }
  }

  saveSubscribersToMailChimp(){
    console.log("saveSubscribersToMailChimp called")
    if (this.state.currentSoundcastID != null && this.state.selectedListId != ''
      && this.state.apiKey != '') {
      this.setState({ updatingList: true })
      const { soundcasts_managed } = this.props.userInfo;
      const { currentSoundcastID } = this.state;
      Axios.post('/api/mail_manage_updateSubscribers', {
        subscribers : soundcasts_managed[currentSoundcastID].subscribed,
        listId : this.state.selectedListId,
        apiKey: this.state.apiKey,
        soundcastId : this.state.currentSoundcastID,
      })
      .then(res => {
        this.setState({ updatingList: false, exportInProgress : false }, () => {
          //We need a 300ms delay, so the dom re-renders before alert is shown.
            setTimeout(function() {
              alert('Subscribers exported to your email list.')
            }, 300);
          }
        )        
      })
      .catch((error) => {
        this.setState({ updatingList: false, exportInProgress : false }, () => {
          //We need a 300ms delay, so the dom re-renders before alert is shown.
            setTimeout(function() {
              alert('There was an error updating the list: ',);
            }, 300);
          }
        )        
        if(error.response.status === 404) {
          console.log("404 error", error)
        }
      });  
    } else {
      this.setState({exportInProgress : false});
      alert('Please select an email list');
    }  
  }

  changeSoundcastId(e) {
    const currentSoundcastID = e.target.value;

    let currentSc = this.props.userInfo.soundcasts_managed[currentSoundcastID];
    let mailChimpId = currentSc.mailChimpId ? currentSc.mailChimpId : '';

    this.setState({
      currentSoundcastID: currentSoundcastID,
      selectedListId: mailChimpId
    })  
  }

  retrieveMailChimpKey(userInfo) {
    if (userInfo && userInfo.publisher) {
      const publisherId = userInfo.publisherID;
      firebase
        .database()
        .ref(`publishers/${publisherId}/mailChimp`)
        .on('value', snapshot => {
          const mailChimp = snapshot.val();
          if (mailChimp != null) {
            this.setState({ list : mailChimp.list,
              apiKey : mailChimp.apiKey})
            //Lets now update the list.

            Axios.post('/api/mail_manage', {
              publisherId : publisherId,
              apiKey: mailChimp.apiKey,
            })
            .catch((error) => {
              if(error.response.status === 404) {
                console.log(error)
              }
            });  

          }
        });
    }
  }

  handleSelectList(value) {
    this.setState({ selectedListId: value });
  }

  renderProgressBar() {
    if (this.state.updatingList) {
      return (
        <Spinner
          size={16}
          speed={1}
        />
      );
    } else {
      return <span> Save </span>
    } 
  }


  render() {
    if (!this.props.isShown) {
      return null;
    } else {
      return (
        <div>
          <div style={styles.backDrop} onClick={this.closeModal} />
          <div style={styles.modal}>
            <div style={{ padding: 25, height: '100%' }}>
              <div className="row">
                <div className="title-small" style={styles.headingText}>
                  {`Automatic Export to Email List`}
                </div>
                <div style={styles.closeButtonWrap}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={this.closeModal.bind(this)}
                  >
                    <i className="fa fa-times fa-2x" style={{ color: 'red' }} />
                  </div>
                </div>
              </div>
              <div
                style={{
                  justifyContent: 'center',
                  height: '100%',
                  paddingLeft: 20,
                  height: '70%',
                  overflow: 'auto',
                }}
              >

                <SoundCastsDropDown 
                  soundcasts={this.props.soundcasts} 
                  currentSoundcastID={this.state.currentSoundcastID}
                  changeSoundcastId={this.changeSoundcastId}/>
                <EmailListDropDown />
                <MailChimpLists 
                  userInfo={this.props.userInfo}
                  list={this.state.list}
                  selectedListId={this.state.selectedListId}
                  handleSelectList={this.handleSelectList}/>
              </div>
              <div className="row" style={{ marginTop: '10px' }}>
                <OrangeSubmitButton
                    label={this.renderProgressBar()}
                    onClick={this.exportSubscribers}
                    styles={{
                      margin: 'auto',
                      backgroundColor: Colors.link,
                      borderWidth: '0px',
                    }}
                  />  
              </div>
            </div>
          </div>
        </div>
      );
    }
  }
}

const styles = {
  backDrop: { ...commonStyles.backDrop },
  muted: {
    fontSize: 16,
    color: Colors.fontGrey,
    fontWeight: 'regular',
    verticalAlign: 'middle',
    wordWrap: 'break-word',
  },
  soundcastSelect: {
    backgroundColor: Colors.mainWhite,
    width: 'calc(100% - 20px)',
    height: 40,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 0,
    fontSize: 16,
  },
  option: {
    fontSize: 16,
  },
  modal: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: '60%',
    height: '70vh',
    transform: 'translate(-50%, -50%)',
    zIndex: '9999',
    background: '#fff',
  },
  headingText: {
    width: '89%',
    margin: 20,
    paddingLeft: 20,
    float: 'left',
    display: 'inline-block',
  },
  closeButtonWrap: {
    // marginTop: 20,
  },
};
