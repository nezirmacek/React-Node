import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as firebase from "firebase";
import Axios from 'axios';
import PropTypes from 'prop-types';
import 'url-search-params-polyfill';
import {orange500, blue500} from 'material-ui/styles/colors';
import {
	BrowserRouter as Router,
	Route,
	Link,
	Redirect,
} from 'react-router-dom';
import { withRouter } from 'react-router';
import moment from 'moment';

import {SoundwiseHeader} from '../components/soundwise_header';
import { signupUser, signinUser, addDefaultSoundcast } from '../actions/index';
import Colors from '../styles/colors';
import { GreyInput } from '../components/inputs/greyInput';
import { minLengthValidator, emailValidator } from '../helpers/validators';
import { inviteListeners } from '../helpers/invite_listeners';
import { addToEmailList } from '../helpers/addToEmailList';
import { OrangeSubmitButton } from '../components/buttons/buttons';
import ImageS3Uploader from '../components/inputs/imageS3Uploader';

var provider = new firebase.auth.FacebookAuthProvider();

class _AppSignup extends Component {
    constructor(props) {
        super(props);
        this.state = {
            firstName: '',
            lastName: '',
            email: props.feedVerified ? props.feedVerified.publisherEmail : '',
            password: '',
            message: '',
            publisher_name: '',
            pic_url: 'https://s3.amazonaws.com/soundwiseinc/user_profile_pic_placeholder.png',
            publisherImage: null,
            redirectToReferrer: false,
            isPublisherFormShown: false,
            isFBauth: false,
            soundcast: props.match.params.mode == 'soundcast_user' && props.match.params.id ? {} : null,
        };

        this.publisherID = moment().format('x') + 'p';
        this.firebaseListener = null;
        this.firebaseListener2 = null;
        this.addDefaultSoundcast = this.addDefaultSoundcast.bind(this)
    }

    componentWillMount() {
        const that = this;
        const params = new URLSearchParams(this.props.location.search);
        const checked = params.get('checked');
        if(this.props.match.params.mode == 'soundcast_user' && this.props.match.params.id) {
            firebase.database().ref(`soundcasts/${this.props.match.params.id}`).once('value')
            .then(snapshot => {
                if(snapshot.val()) {
                    that.setState({
                        soundcast: snapshot.val(),
                        soundcastID: that.props.match.params.id,
                        checked: checked ? checked : 0,
                        sumTotal: checked ? snapshot.val().prices[checked].price : snapshot.val().prices[0].price,
                    });
                }
            })
        }
    }

    componentDidMount() {
        const that = this;
        const params = new URLSearchParams(this.props.location.search);
        const checked = params.get('checked');
        if(this.props.match.params.mode == 'admin' && this.props.match.params.id) {
            this.publisherID = this.props.match.params.id;
        }
        if(this.props.history.location.state) {
            const {soundcast, soundcastID, checked, sumTotal} = this.props.history.location.state;
            this.setState({
                soundcast,
                soundcastID,
                checked,
                sumTotal
            });
        }

    }

    componentWillUnmount() {
      this.firebaseListener = null;
      this.firebaseListener2 = null;
    }

    setStatePromise(that, newState) {
        return new Promise((resolve) => {
            that.setState(newState, () => {
                resolve();
            });
        });
    }

    signUp() {
        const {firstName, lastName, email, password, pic_url, soundcast, checked, sumTotal, soundcastID} = this.state;
        const {history, match} = this.props;
        const that = this;

        this.setState({ isFBauth: false });
        if (!this._validateForm(firstName, lastName, email, password)) return;

        firebase.auth().fetchProvidersForEmail(email)
        .then(authArr => {
            // console.log('authArr: ', authArr);
            if(authArr.length > 0) {
                if(match.params.mode == 'admin' && match.params.id) {
                  history.push(`/signin/admin/${match.params.id}`, {text: 'This account already exists. Please sign in instead'});
                  return;
                } else if(match.params.mode == 'soundcast_user' && (history.location.state || match.params.id)) {
                  history.push('/signin', {text: 'This account already exists. Please sign in instead',
                      soundcast,
                      soundcastID,
                      checked,
                      sumTotal,
                  });
                } else {
                  history.push('/signin', {text: 'This account already exists. Please sign in instead'
                  });
                }
            } else {
                if (match.params.mode !== 'admin') { // listener case
                    that._signUp();
                } else if (match.params.mode == 'admin' && match.params.id) { // admin from invitation with publisher id
                    that.signUpInvitedAdmin();
                } else { // admin case
                    that.setState({isPublisherFormShown: true});
                }
            }
        })
        .catch(err => console.log('error: ', err));
    }

    getUrl (url) {
        this.setState({publisherImage: url});
    }

    signUpInvitedAdmin(user) {
        const that = this;
        const { match, history } = this.props;
        const { firstName, lastName, email, password, pic_url, publisher_name, publisherImage, isFBauth } = this.state;

        if(!isFBauth) {
            this._signUp().then(
                res => {
                      firebase.auth().onAuthStateChanged(function(user) {
                            if (user) {
                                const creatorID = user.uid;
                                firebase.database().ref(`publishers/${that.publisherID}/administrators/${creatorID}`).set(true);

                                firebase.database().ref(`publishers/${that.publisherID}/soundcasts`)
                                .once('value')
                                .then(snapshot => {
                                    firebase.database().ref(`users/${creatorID}/soundcasts_managed`)
                                    .set(snapshot.val());

                                    firebase.database().ref(`users/${creatorID}/admin`).set(true);

                                    firebase.database().ref(`users/${creatorID}/publisherID`).set(that.publisherID);

                                    console.log('completed adding publisher to invited admin');
                                })
                                .then(() => {
                                    that.compileUser();
                                })
                                .then(() => {
                                    history.push('/dashboard/soundcasts');
                                });
                            } else {
                                // alert('Admin saving failed. Please try again later.');
                                // Raven.captureMessage('invited admin saving failed!')
                            }
                      });
                }
            );
        } else {
            this.signUpUser(user);

              firebase.auth().onAuthStateChanged(function(user) {
                    if (user) {
                        const creatorID = user.uid;
                        firebase.database().ref(`publishers/${that.publisherID}/administrators/${creatorID}`).set(true);

                        firebase.database().ref(`publishers/${that.publisherID}/soundcasts`)
                        .once('value')
                        .then(snapshot => {
                            firebase.database().ref(`users/${creatorID}/soundcasts_managed`)
                            .set(snapshot.val());

                            firebase.database().ref(`users/${creatorID}/admin`).set(true);

                            console.log('completed adding publisher to invited admin');
                        })
                        .then(() => {
                            that.compileUser();
                        })
                        .then(() => {
                            history.push('/dashboard/soundcasts');
                        });
                    } else {
                        // alert('Admin saving failed. Please try again later.');
                        // Raven.captureMessage('invited admin saving failed!')
                    }
              });
        }

    }

    signUpAdmin () {
        const that = this;
        const { match, history } = this.props;
        const { firstName, lastName, email, password, pic_url, publisher_name, publisherImage, isFBauth } = this.state;

        this.setState({ isFBauth: true });
        if(publisher_name.length < 1) {
            alert('Please enter a publisher name!');
            return;
        }
        if (!this._validateForm(firstName, lastName, email, password, isFBauth)) return;

        this._signUp().then(
            res => {
                if (this.props.match.params.mode === 'admin') { // admin case
                    const publisherNameEncode = encodeURIComponent(publisher_name);
                    const imageLink = `https://dummyimage.com/300.png/F76B1C/ffffff&text=${publisherNameEncode}`;

                      that.firebaseListener = firebase.auth().onAuthStateChanged(function(user) {
                            if (user && that.firebaseListener) {
                                let _newPublisher = {
                                    name: publisher_name,
                                    imageUrl: publisherImage || imageLink,
                                    administrators: {
                                        [user.uid]: true,
                                    },
                                    email,
                                };

                                firebase.database().ref(`publishers/${that.publisherID}`).set(_newPublisher).then(
                                    res => {
                                        // console.log('success add publisher: ', res);
                                        Axios.post('https://mysoundwise.com/api/publishers', {
                                            publisherId: that.publisherID,
                                            name: publisher_name,
                                            createdAt: moment().utc().format(),
                                            updatedAt: moment().utc().format(),
                                        })
                                        .then((res) => {
                                          console.log('publisher added to db');
                                          that.addDefaultSoundcast();
                                        })
                                        .catch((err) => {
                                          that.addDefaultSoundcast();
                                      })
                                    },
                                    err => {
                                        console.log('ERROR add publisher: ', err);
                                    }
                                );
                            } else {
                                // alert('Admin saving failed. Please try again later.');
                                // Raven.captureMessage('admin saving failed!')
                            }
                      });
                      that.firebaseListener && that.firebaseListener();
                }
            }
        );
    }

    async compileUser() {
        const { signinUser, history, userInfo, match } = this.props;
        let fb_operation;

          firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                const creatorID = user.uid;
                firebase.database().ref(`users/${creatorID}`).once('value')
                .then(user_snapshot => {
                    let _user = user_snapshot.val();
                    if (_user.soundcasts_managed && _user.admin) {
                        if (_user.publisherID) {
                            firebase.database().ref(`publishers/${_user.publisherID}`).once('value')
                            .then(publisher_snapshot => {
                                if (publisher_snapshot.val()) {
                                    const _publisher = JSON.parse(JSON.stringify(publisher_snapshot.val()));
                                    _publisher.id = _user.publisherID;
                                    _user.publisher = _publisher;

                                    if (_user.publisher.administrators) {
                                        let admins = {};
                                        for (let adminId in _user.publisher.administrators) {
                                            firebase.database().ref(`users/${adminId}`).once('value')
                                            .then(adminSnapshot => {
                                                admins[adminId] = adminSnapshot;
                                                if (admins[adminId].val()) {
                                                    const _admin = JSON.parse(JSON.stringify(admins[adminId].val()));
                                                    _user.publisher.administrators[adminId] = _admin;
                                                }
                                            })
                                        }
                                    }
                                }
                            })
                        }

                        let soundcastsManaged = {};
                        for (let key in _user.soundcasts_managed) {
                            firebase.database().ref(`soundcasts/${key}`).once('value')
                            .then(soundcastSnapshot => {
                                soundcastsManaged[key] = soundcastSnapshot;
                                if (soundcastsManaged[key].val()) {
                                    _user = JSON.parse(JSON.stringify(_user));
                                    const _soundcast = JSON.parse(JSON.stringify(soundcastsManaged[key].val()));
                                    _user.soundcasts_managed[key] = _soundcast;
                                    signinUser(_user);
                                    if (_soundcast.episodes) {
                                        let episodes = {};
                                        for (let epkey in _soundcast.episodes) {
                                            firebase.database().ref(`episodes/${epkey}`).once('value')
                                            .then(episodeSnapshot => {
                                                episodes[epkey] = episodeSnapshot;
                                                if (episodes[epkey].val()) {
                                                    _user = JSON.parse(JSON.stringify(_user));
                                                    _user.soundcasts_managed[key].episodes[epkey] = JSON.parse(JSON.stringify(episodes[epkey].val()));
                                                    signinUser(_user);
                                                }
                                            })
                                        }
                                    }
                                }
                            });
                        }
                    }

                    if (_user.soundcasts) {
                        let userSoundcasts = {};
                        for (let key in _user.soundcasts) {
                            firebase.database().ref(`soundcasts/${key}`).once('value')
                            .then(soundcastSnapshot => {
                                userSoundcasts[key] = soundcastSnapshot;
                                if (userSoundcasts[key].val()) {
                                    _user = JSON.parse(JSON.stringify(_user));
                                    const _soundcast = JSON.parse(JSON.stringify(userSoundcasts[key].val()));
                                    _user.soundcasts[key] = _soundcast;
                                    signinUser(_user);
                                    if (_soundcast.episodes) {
                                        let soundcastEpisodes = {};
                                        for (let epkey in _soundcast.episodes) {
                                            firebase.database().ref(`episodes/${epkey}`).once('value')
                                            .then(episodeSnapshot => {
                                                soundcastEpisodes[epkey] = episodeSnapshot;
                                                if (soundcastEpisodes[epkey].val()) {
                                                    _user = JSON.parse(JSON.stringify(_user));
                                                    _user.soundcasts[key].episodes[epkey] = JSON.parse(JSON.stringify(soundcastEpisodes[epkey].val()));
                                                    signinUser(_user);
                                                }
                                            })
                                        }
                                    }
                                }
                            })
                        }
                    }
                })
            } else {
                // alert('User saving failed. Please try again later.');
                // Raven.captureMessage('user saving failed!')
            }
          });
    }

    addDefaultSoundcast() {
        const { history, addDefaultSoundcast, defaultSoundcastAdded } = this.props;
        const that = this;
        const params = new URLSearchParams(this.props.location.search);
        if(!defaultSoundcastAdded) {
          this.firebaseListener2 = firebase.auth().onAuthStateChanged(function(user) {
                if (user && that.firebaseListener2) {
                    const creatorID = user.uid;
                    const { firstName, lastName, email, password, pic_url, publisher_name, publisherImage, isFBauth } = that.state;
                    const subscribed = {};
                    const _email = email.replace(/\./g, "(dot)");
                    subscribed[creatorID] = moment().format('X');

                    const soundcastId = `${moment().format('x')}s`;

                    const newSoundcast = {
                        title: 'Default Soundcast',
                        imageURL: 'https://s3.amazonaws.com/soundwiseinc/default+image.jpg',
                        hostImageURL: 'https://s3.amazonaws.com/soundwiseinc/user_profile_pic_placeholder.png',
                        short_description: 'First soundcast',
                        creatorID,
                        publisherID: that.publisherID,
                        prices: [{price: 'free', billingCycle: 'free'}],
                        forSale: false,
                        published: false,
                        landingPage: false,
                    };

                    let _promises = [
                    // add soundcast to soundcasts node
                        firebase.database().ref(`soundcasts/${soundcastId}`).set(newSoundcast).then(
                            res => {
                                console.log('success add soundcast: ', res);
                                return res;
                            },
                            err => {
                                console.log('ERROR add soundcast: ', err);
                                Promise.reject(err);
                            }
                        ),
                        // add soundcast to publisher
                        firebase.database().ref(`publishers/${that.publisherID}/soundcasts/${soundcastId}`).set(true).then(
                            res => {
                                console.log('success add soundcast to publisher: ', res);
                                return res;
                            },
                            err => {
                                console.log('ERROR add soundcast to publisher: ', err);
                                Promise.reject(err);
                            }
                        ),
                        // add soundcast to admin
                        firebase.database().ref(`users/${creatorID}/soundcasts_managed/${soundcastId}`).set(true).then(
                            res => {
                                console.log('success add soundcast to admin.soundcasts_managed: ', res);
                                return res;
                            },
                            err => {
                                console.log('ERROR add soundcast to admin.soundcasts_managed: ', err);
                                Promise.reject(err);
                            }
                        ),
                        Axios.post('/api/soundcast', {
                            soundcastId: soundcastId,
                            publisherId: that.publisherID,
                            title: newSoundcast.title,
                        }).then(
                            res => {
                                return res;
                            }
                        ).catch(
                            err => {
                                console.log('ERROR API post soundcast: ', err);
                                Promise.reject(err)
                            }
                        )
                    ];

                    Promise.all(_promises)
                    .then(
                        res => {
                            console.log('completed adding soundcast');
                            that.firebaseListener = null;
                            addDefaultSoundcast();
                            that.compileUser();
                        },
                        err => {
                            console.log('failed to complete adding soundcast');
                        }
                    )
                    .then(() => {
                        const content = `<p>Hello ${firstName.slice(0,1).toUpperCase() + firstName.slice(1)},</p><p></p><p>This is Natasha, founder of Soundwise. We're so excited to have you join our expanding community of knowledge creators!</p><p>If you're creating a podcast, make sure to check out our <a href="http://bit.ly/2IILSGm">quick start guide</a> and <a href="http://bit.ly/2qlyVKK">"how to get subscribers" guide</a>.</p><p>I'm curious...would you mind sharing what kind of content you're creating? </p><p></p><p>Click reply and let me know.</p><p></p><p>Natasha</p><p></p><p>p.s. If you need help with anything related to creating your audio program, please don't hesitate to shoot me an email. We'll try our best to help.</p>`;
                        inviteListeners([{firstName, lastName, email}], `What are you creating, ${firstName.slice(0,1).toUpperCase() + firstName.slice(1)}?`, content,'Natasha Che', null, 'natasha@mysoundwise.com', true, 'natasha@mysoundwise.com');
                        addToEmailList (null, [email], 'soundwise publishers', 2876261); // 2876261 is the 'soundwise publishers' list id
                        if(params.get('frequency') && params.get('plan')) {
                            history.push({
                              pathname: '/buy',
                              state: {
                                plan: params.get('plan'),
                                frequency: params.get('frequency'),
                                price: params.get('price')
                              }
                            });
                        } else {
                            history.push('/dashboard/soundcasts');
                        }
                    });
                } else {
                    // Raven.captureMessage('Default soundcast saving failed!')
                }
          });
          this.firebaseListener2 && this.firebaseListener2();
        }
    }

    _validateForm (firstName, lastName, email, password, isFBauth) {
        if(firstName.length < 1 || lastName.length < 1) {
            alert('Please enter your name!');
            return false;
        } else if (!emailValidator(email)) {
            alert ('Please enter a valid email!');
            return false;
        } else if (password.length < 1 && !isFBauth ) {
            alert('Please enter a passowrd!');
            return false;
        } else {
            return true;
        }
    }

    async _signUp () {
        const { match, history, signupUser } = this.props;
        const {firstName, lastName, email, password, pic_url, isFBauth} = this.state;
        let authArr = [];
        try {
            authArr = await firebase.auth().fetchProvidersForEmail(email);
        } catch(err) {
            console.log(err);
        }

        // console.log('authArr: ', authArr);

        if(authArr.length > 0) {
            if(match.params.mode == 'admin' && match.params.id) {
              history.push(`/signin/admin/${match.params.id}`, {text: 'This account already exists. Please sign in instead'});
              return;
            } else {
              history.push('/signin', {text: 'This account already exists. Please sign in instead'});
            }
        }

        try {
            if (!isFBauth) {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
            }
            this.setState({message: "account created"});
            this.signUpUser();
            return true;
        } catch (error) {
            this.setState({
                message: error.toString()
            });
            console.log(error.toString());
            Promise.reject(error);
        }
    }

    signUpUser (userToSignUP) {
        // console.log('signUpUser called');
        const { match, history, signupUser } = this.props;
        const that = this;
        if(history.location.state && history.location.state.soundcast) {
          const {soundcast, soundcastID, checked, sumTotal} = history.location.state;
        }
        let firstName, lastName, email, pic_url;

        if(userToSignUP) {
            firstName = userToSignUP.firstName;
            lastName = userToSignUP.lastName;
            email = userToSignUP.email;
            pic_url = userToSignUP.pic_url;

        } else {
            firstName = this.state.firstName;
            lastName = this.state.lastName;
            email = this.state.email;
            pic_url = this.state.pic_url;
        }

        let userId;

        firebase.auth().onAuthStateChanged(user => {
            if(user) {
                userId = user.uid;

                const userToSave = { firstName, lastName, email: { 0: email }, pic_url };
                // add admin fields
                if (match.params.mode === 'admin') {
                    userToSave.admin = true;
                    userToSave.publisherID = that.publisherID;
                }

                firebase.database().ref(`users/${userId}`)
                .once('value')
                .then(userSnapshot => {
                    if(!userSnapshot.val()) {
                        firebase.database().ref('users/' + userId).set(userToSave);
                    }
                })

                const _user = { userId, firstName, lastName, picURL: pic_url || 'https://s3.amazonaws.com/soundwiseinc/user_profile_pic_placeholder.png' };
                // TODO: _user.picURL = false
                Axios.post('https://mysoundwise.com/api/user', _user)
                    .then(res => {
                        // console.log('userToSave: ', userToSave);
                        console.log('success save user');
                        signupUser(userToSave);
                        // for user -> goTo myPrograms, for admin need to register publisher first
                        if (match.params.mode !== 'admin' && match.params.mode !== 'soundcast_user') {
                            history.push('/myprograms');
                        } else if(match.params.mode == 'soundcast_user' && history.location.state) {
                            history.push('/soundcast_checkout', {
                                soundcast: history.location.state.soundcast,
                                soundcastID: history.location.state.soundcastID,
                                checked: history.location.state.checked,
                                sumTotal: history.location.state.sumTotal,
                            });
                        }
                    })
                    .catch(err => {
                        console.log('user saving failed: ', err);
                        signupUser(userToSave);
                        // for user -> goTo myPrograms, for admin need to register publisher first
                        if (match.params.mode !== 'admin' && match.params.mode !== 'soundcast_user') {
                            history.push('/myprograms');
                        } else if(match.params.mode == 'soundcast_user' && history.location.state) {
                            history.push('/soundcast_checkout', {
                                soundcast: history.location.state.soundcast,
                                soundcastID: history.location.state.soundcastID,
                                checked: history.location.state.checked,
                                sumTotal: history.location.state.sumTotal,
                            });
                        }
                    })
            }
        })
    }

    handleChange(prop, e) {
        this.setState({
            [prop]: e.target.value
        })
    }

    handleFBAuth() {
        const { match, history, signupUser, signinUser } = this.props;
        const that = this;
        this.setState({ isFBauth: true });

        firebase.auth().signInWithPopup(provider)
            .then(function(result) {
                // This gives you a Facebook Access Token. You can use it to access the Facebook API.
                // The signed-in user info.
                  firebase.auth().onAuthStateChanged(function(user) {
                        if (user) {
                            const userId = user.uid;
                            firebase.database().ref('users/' + userId)
                                .once('value')
                                .then(snapshot => {
                                    if(snapshot.val() && typeof(snapshot.val().firstName) !== 'undefined') { // if user already exists
                                        console.log('user already exists');
                                        let updates = {};
                                        updates['/users/' + userId + '/pic_url/'] = snapshot.val().pic_url;
                                        firebase.database().ref().update(updates);

                                        let _user = snapshot.val();
                                        _user.pic_url = _user.photoURL;
                                        delete _user.photoURL;
                                        signinUser(_user);

                                        that.setState({
                                            firstName: _user.firstName,
                                            lastName: _user.lastName,
                                            email: _user.email[0],
                                            pic_url: _user.pic_url,
                                        });

                                        if (_user.admin && !match.params.id) {
                                            history.push('/dashboard/soundcasts');
                                        } else if (match.params.mode == 'admin' && match.params.id) {
                                            that.signUpInvitedAdmin();
                                        } else  if (_user.soundcasts) {
                                            history.push('/mysoundcasts');
                                        } else  {
                                            history.push('/myprograms');
                                        }
                                    } else {  //if it's a new user
                                        const { email, photoURL, displayName } = JSON.parse(JSON.stringify(result.user));
                                        const name = displayName ? displayName.split(' ') : ['User', ''];
                                        const user = {
                                            firstName: name[0],
                                            lastName: name[1],
                                            email,
                                            pic_url: photoURL ? photoURL : '../images/smiley_face.jpg',
                                        };
                                        if (match.params.mode === 'admin' && !match.params.id) {
                                            that.setState({
                                                firstName: name[0],
                                                lastName: name[1],
                                                email,
                                                pic_url: photoURL ? photoURL : '../images/smiley_face.jpg',
                                                isPublisherFormShown: true,
                                            });
                                        } else if(match.params.mode == 'admin' && match.params.id) {
                                            that.signUpInvitedAdmin(user);
                                        } else {
                                            that.signUpUser(user);
                                        }

                                    }
                                });
                            // })
                        } else {
                            // alert('User saving failed. Please try again later.');
                            // Raven.captureMessage('user saving failed!')
                        }
                  });
            })
            .catch(function(error) {
                // Handle Errors here.
                if (error.code === 'auth/account-exists-with-different-credential') {
                    // Step 2.
                    // User's email already exists.
                    // The pending Facebook credential.
                    var pendingCred = error.credential;
                    // The provider account's email address.
                    var email = error.email;
                    // Get registered providers for this email.
                    firebase.auth().fetchProvidersForEmail(email).then(function(providers) {
                        // Step 3.
                        // If the user has several providers,
                        // the first provider in the list will be the "recommended" provider to use.
                        if (providers[0] === 'password') {
                            // Asks the user his password.
                            // In real scenario, you should handle this asynchronously.
                            var password = prompt('Please enter your Soundwise password'); // TODO: implement promptUserForPassword.
                            firebase.auth().signInWithEmailAndPassword(email, password).then(function(user) {
                                // Step 4a.
                                return user.link(pendingCred);
                            }).then(function() {
                                // Facebook account successfully linked to the existing Firebase user.

                                  firebase.auth().onAuthStateChanged(function(user) {
                                        if (user) {
                                            const userId = user.uid;
                                            firebase.database().ref('users/' + userId)
                                                .once('value')
                                                .then(snapshot => {
                                                    const { firstName, lastName, email, pic_url } = snapshot.val();
                                                    const user = {
                                                        firstName,
                                                        lastName,
                                                        email,
                                                        pic_url
                                                    };
                                                    that.setState({ firstName, lastName, email, pic_url });
                                                    if (match.params.mode === 'admin' && !match.params.id) {
                                                        that.setState({isPublisherFormShown: true});
                                                    } else if(match.params.mode == 'admin' && match.params.id) {
                                                        that.signUpInvitedAdmin(user);
                                                    } else {
                                                        that.signUpUser(user);
                                                    }
                                                });
                                        } else {
                                            // alert('profile saving failed. Please try again later.');
                                            // Raven.captureMessage('profile saving failed!')
                                        }
                                  });
                            })
                        }
                    })
                }
            });
    }

    render() {
        const { match, history } = this.props;

        const { firstName, lastName, email, password, redirectToReferrer, isPublisherFormShown, publisher_name, soundcast, checked, sumTotal, soundcastID } = this.state;
        const { from } = this.props.location.state || { from: { pathname: '/courses' } };

        if(redirectToReferrer) {
            return (
                <Redirect to={from} />
			)
		}
		return (
            <div className="row" style={{...styles.row, height: Math.max(window.innerHeight, 700), overflow: 'auto'}}>
				{
                    soundcast &&
                    <div className='col-lg-8 col-md-12 col-sm-12 col-xs-12 center-col'>
                        <div className="col-lg-6 col-md-6 col-sm-6 col-xs-12  text-center">
                            <img className='hidden-xs' alt="Soundcast cover art" src={soundcast.imageURL} style={{...styles.logo, height: 120}}/>
                            <div style={styles.containerWrapper}>
                                <div style={styles.container} className="center-col text-center">

                                    <button
                                        onClick={() => this.handleFBAuth()}
                                        className="text-white btn btn-medium propClone btn-3d width-60 builder-bg tz-text bg-blue tz-background-color"
                                        style={{...styles.fb, marginTop: 30}}
                                    >
                                        <i
                                            className="fab fa-facebook-f icon-extra-small margin-four-right tz-icon-color vertical-align-sub"
                                            style={styles.fbIcon}
                                        ></i>
                                        <span className="tz-text">SIGN UP with FACEBOOK</span>
                                    </button>
                                    <hr />
                                    <span style={styles.withEmailText}>or with email</span>
                                </div>
                                <div style={styles.container} className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                                    <GreyInput
                                        type="text"
                                        styles={{}}
                                        wrapperStyles={styles.inputTitleWrapper}
                                        placeholder={'First name'}
                                        onChange={this.handleChange.bind(this, 'firstName')}
                                        value={firstName}
                                        validators={[minLengthValidator.bind(null, 1)]}
                                    />
                                </div>
                                <div style={styles.container} className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                                    <GreyInput
                                        type="text"
                                        styles={{}}
                                        wrapperStyles={styles.inputTitleWrapper}
                                        placeholder={'Last name'}
                                        onChange={this.handleChange.bind(this, 'lastName')}
                                        value={lastName}
                                        validators={[minLengthValidator.bind(null, 1)]}
                                    />
                                </div>
                                <div style={styles.container} className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                    <GreyInput
                                        type="email"
                                        styles={{}}
                                        wrapperStyles={styles.inputTitleWrapper}
                                        placeholder={'Email'}
                                        onChange={this.handleChange.bind(this, 'email')}
                                        value={email}
                                        validators={[minLengthValidator.bind(null, 1)]}
                                    />
                                    <GreyInput
                                        type="password"
                                        styles={{}}
                                        wrapperStyles={styles.inputTitleWrapper}
                                        placeholder={'Password'}
                                        onChange={this.handleChange.bind(this, 'password')}
                                        value={password}
                                        validators={[minLengthValidator.bind(null, 1)]}
                                    />
                                    <div>
                                        {/*<input*/}
                                            {/*type="checkbox"*/}
                                            {/*onChange={(e) => {this.setState({isAccepted: e.target.checked});}}*/}
                                            {/*checked={isAccepted}*/}
                                            {/*style={styles.checkbox}*/}
                                        {/*/>*/}
                                        <span style={styles.acceptText}>
                                            By signing up I accept the terms of use and <Link to="/privacy">privacy policy</Link>.
                                        </span>
                                    </div>
                                    {
                                        <OrangeSubmitButton
                                            label="Get Access"
                                            onClick={this.signUp.bind(this)}
                                            styles={{marginTop: 15, marginBottom: 15}}
                                        />
                                    }

                                    <div style={{marginBottom: 15}}>
                                        <span style={styles.italicText}>Already have an account? </span>
                                        {
                                            <Link
                                              to={{
                                                pathname: '/signin',
                                                state: {
                                                    soundcast,
                                                    soundcastID,
                                                    checked,
                                                    sumTotal
                                                }
                                              }}
                                              style={{...styles.italicText, color: Colors.link, marginLeft: 5}}> Sign in >
                                            </Link>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='col-lg-6 col-md-6 col-sm-6 col-xs-12'>
                            <div className='margin-twenty-one-top sm-margin-nineteen-top title-medium text-dark-gray' style={{paddingBottom: 35, textAlign: 'center'}}><span>{soundcast.title}</span></div>
                            <div style={{marginBottom: 20, fontSize: 15}} className='text-large text-center text-dark-gray'>{soundcast.short_description}</div>
                            <ul className="" style={{paddingBottom: '1em', display: 'flex', flexWrap: 'wrap'}}>
                                {soundcast.features && soundcast.features.map((feature, i) => {
                                    return (
                                        <li key={i} className=" text-dark-gray text-large  margin-lr-auto col-md-12 col-sm-12 col-xs-12 tz-text" style={{paddingLeft: '0em', paddingRight: '1em', paddingTop: '1em', paddingBottom: '1em', listStyleType: 'none', display: 'flex', alignItems: 'center', }}><span style={{paddingRight: 10}}>
                                            ⭐</span>{feature}
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    </div>
                    ||
					!isPublisherFormShown && !soundcast
					&&
                    <div className="col-lg-4 col-md-6 col-sm-8 col-xs-12 center-col text-center">
                        <img className='hidden-xs' alt="Soundwise Logo" src="/images/soundwiselogo.svg" style={styles.logo}/>
                        <div style={styles.containerWrapper}>
                            <div style={styles.container} className="center-col text-center">
                                <div style={styles.title}>Let's get started!</div>
                                <button
                                    onClick={() => this.handleFBAuth()}
                                    className="text-white btn btn-medium propClone btn-3d width-60 builder-bg tz-text bg-blue tz-background-color"
                                    style={styles.fb}
                                >
                                    <i
                                        className="fab fa-facebook-f icon-extra-small margin-four-right tz-icon-color vertical-align-sub"
                                        style={styles.fbIcon}
                                    ></i>
                                    <span className="tz-text">SIGN UP with FACEBOOK</span>
                                </button>
                                <hr />
                                <span style={styles.withEmailText}>or with email</span>
                            </div>
                            <div style={styles.container} className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                                <GreyInput
                                    type="text"
                                    styles={{}}
                                    wrapperStyles={styles.inputTitleWrapper}
                                    placeholder={'First name'}
                                    onChange={this.handleChange.bind(this, 'firstName')}
                                    value={firstName}
                                    validators={[minLengthValidator.bind(null, 1)]}
                                />
                            </div>
                            <div style={styles.container} className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                                <GreyInput
                                    type="text"
                                    styles={{}}
                                    wrapperStyles={styles.inputTitleWrapper}
                                    placeholder={'Last name'}
                                    onChange={this.handleChange.bind(this, 'lastName')}
                                    value={lastName}
                                    validators={[minLengthValidator.bind(null, 1)]}
                                />
                            </div>
                            <div style={styles.container} className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                <GreyInput
                                    type="email"
                                    styles={{}}
                                    wrapperStyles={styles.inputTitleWrapper}
                                    placeholder={'Email'}
                                    onChange={this.handleChange.bind(this, 'email')}
                                    value={email}
                                    validators={[minLengthValidator.bind(null, 1), emailValidator]}
                                />
                                <GreyInput
                                    type="password"
                                    styles={{}}
                                    wrapperStyles={styles.inputTitleWrapper}
                                    placeholder={'Password'}
                                    onChange={this.handleChange.bind(this, 'password')}
                                    value={password}
                                    validators={[minLengthValidator.bind(null, 1)]}
                                />
                                <div>
                                    <span style={styles.acceptText}>
                                        By signing up I accept the terms of use and <Link to="/privacy">privacy policy</Link>.
                                    </span>
                                </div>
                                {
                                    match.params.mode === 'admin'
                                    && !match.params.id
                                    &&
                                    <OrangeSubmitButton
                                        styles={{marginTop: 15, marginBottom: 15}}
                                        label="NEXT"
                                        onClick={this.signUp.bind(this)}
                                    />
                                    ||
                                    <OrangeSubmitButton
                                        label="CREATE ACCOUNT"
                                        onClick={this.signUp.bind(this)}
                                        styles={{marginTop: 15, marginBottom: 15}}
                                    />
                                }

                                <div style={{marginBottom: 15}}>
                                    <span style={styles.italicText}>Already have an account? </span>
                                    {
                                        !history.location.state &&
                                        <Link
                                          to='/signin'
                                          style={{...styles.italicText, color: Colors.link, marginLeft: 5}}> Sign in >
                                        </Link>
                                        ||
                                        <Link
                                          to={{
                                            pathname: '/signin',
                                            state: {
                                                soundcast: history.location.state.soundcast,
                                                soundcastID: history.location.state.soundcastID,
                                                checked: history.location.state.checked,
                                                sumTotal: history.location.state.sumTotal
                                            }
                                          }}
                                          style={{...styles.italicText, color: Colors.link, marginLeft: 5}}> Sign in >
                                        </Link>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    ||
                    <div className="col-lg-4 col-md-6 col-sm-8 col-xs-12 center-col">
                        <div className="center-col text-center">
                            <img className='hidden-xs' alt="Soundwise Logo" src="/images/soundwiselogo.svg" style={styles.logo}/>
                        </div>
                        <div style={{...styles.containerWrapper, padding: 15}}>
                            <div style={styles.container} className="center-col text-center">
                                <div style={{...styles.title, marginBottom: 10}}>Create Your Publisher Account</div>
                            </div>
                            <div style={{...styles.container, paddding: 15}} className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                <div style={{...styles.inputLabel, fontWeight: 700, marginBottom: 15}}>Publisher name</div>
                                <div style={{...styles.italicText, marginBottom: 20, height: 36}}>(this can be the name of your business, brand, team. You can always change it later.)</div>
                                <GreyInput
                                    type="email"
                                    styles={styles.greyInputText}
                                    wrapperStyles={styles.inputTitleWrapper}
                                    placeholder={'Publisher name'}
                                    onChange={this.handleChange.bind(this, 'publisher_name')}
                                    value={publisher_name}
                                    validators={[minLengthValidator.bind(null, 1)]}
                                />
                                <OrangeSubmitButton
                                    label="CREATE ACCOUNT"
                                    onClick={this.signUpAdmin.bind(this)}
                                    styles={{marginTop: 15, marginBottom: 15}}
                                />
                            </div>
                        </div>
                    </div>
                }
            </div>
        )
    }
}

_AppSignup.propTypes = {
    match: PropTypes.object, // path info
};

const styles = {
    row: {
        backgroundColor: Colors.window,
        paddingTop: 15,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
    },
    logo: {
        marginBottom: 18,
        height: 50,
    },
    containerWrapper: {
        overflow: 'hidden',
        borderRadius: 3,
        width: 'auto',
        backgroundColor: Colors.mainWhite,
    },
    container: {
        backgroundColor: Colors.mainWhite,
    },
    title: {
        paddingTop: 20,
        paddingBottom: 20,
        fontSize: 26,
        color: Colors.fontBlack,
    },
    fb: {
        width: 212,
        height: 44,
        marginTop: 10,
        marginBottom: 10
    },
    fbIcon: {
        marginLeft: 0,
        marginRight: 20,
        position: 'relative',
        bottom: 2,
        right: '10px',
    },
    withEmailText: {
        fontSize: 14,
        display: 'inline-block',
        paddingLeft: 20,
        paddingRight: 20,
        position: 'relative',
        bottom: 35,
        backgroundColor: Colors.mainWhite,
        fontStyle: 'Italic',
    },
    checkbox: {
        width: 20,
    },
    acceptText: {
        fontSize: 11,
        position: 'relative',
        bottom: 3,
    },
    submitButton: {
        marginTop: 15,
        marginBottom: 15,
        backgroundColor: Colors.link,
        borderColor: Colors.link,
    },
    italicText: {
        fontSize: 16,
        fontStyle: 'Italic',
        marginBottom: 10,
        display: 'inline-block',
        height: 16,
        lineHeight: '16px',
    },

    inputLabel: {
        fontSize: 16,
        marginBottom: 3,
        marginTop: 0,
        position: 'relative',
        // top: 10,
    },
    greyInputText: {
        fontSize: 16,
    },
};

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ signupUser, signinUser, addDefaultSoundcast }, dispatch)
}

const mapStateToProps = state => {
    const { userInfo, isLoggedIn, defaultSoundcastAdded } = state.user;
    return {
				userInfo, isLoggedIn, defaultSoundcastAdded,
				feedVerified: state.setFeedVerified.feedVerified,
    }
};

const AppSignup_worouter = connect(mapStateToProps, mapDispatchToProps)(_AppSignup);

export const AppSignup = withRouter(AppSignup_worouter);
