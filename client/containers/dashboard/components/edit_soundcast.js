
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Axios from 'axios';
import firebase from 'firebase';
import { Editor } from 'react-draft-wysiwyg';
import { convertFromRaw, convertToRaw, EditorState, convertFromHTML, createFromBlockArray, ContentState } from 'draft-js';
// import Toggle from 'material-ui/Toggle';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import Checkbox from 'material-ui/Checkbox';
import {RadioButton, RadioButtonGroup} from 'material-ui/RadioButton';
import Toggle from 'react-toggle'
import "react-toggle/style.css"
import Dots from 'react-activity/lib/Dots';

import {minLengthValidator, maxLengthValidator} from '../../../helpers/validators';
import ValidatedInput from '../../../components/inputs/validatedInput';
import ImageCropModal from './image_crop_modal';
import Colors from '../../../styles/colors';
import {itunesCategories} from '../../../helpers/itunes_categories';
import { OrangeSubmitButton, TransparentShortSubmitButton } from '../../../components/buttons/buttons';

const subscriptionConfirmEmailHtml = `<div style="font-size:18px;"><p>Hi [subscriber first name],</p>
<p></p>
<p>Thanks for subscribing to [soundcast title]. If you don't have the Soundwise mobile app installed on your phone, please access your soundcast by downloading the app first--</p>
<p><strong>
<span>iPhone user: Download the app </span>
<a href="https://itunes.apple.com/us/app/soundwise-learn-on-the-go/id1290299134?ls=1&mt=8"><span style="border-bottom: 2px solid currentColor;">here</span></a>.
</strong></p>
<p><strong>
<span>Android user: Download the app <span>
<a href="https://play.google.com/store/apps/details?id=com.soundwisecms_mobile_android"><span style="border-bottom: 2px solid currentColor;" >here</span></a>.
</strong></p><p></p>
<p>...and then sign in to the app with the same credential you used to subscribe to this soundcast.</p><p></p><p>If you've already installed the app, your new soundcast should be loaded automatically.</p>
</div>`;
const subscriptionConfirmationEmail = convertFromHTML(subscriptionConfirmEmailHtml);
const confirmationEmail = ContentState.createFromBlockArray(
  subscriptionConfirmationEmail.contentBlocks,
  subscriptionConfirmationEmail.entityMap
);

export default class EditSoundcast extends Component {
    constructor (props) {
        super(props);

        this.state = {
            title: '',
            imageURL: '',
            short_description: '',
            long_description: EditorState.createEmpty(),
            subscribed: {},
            fileUploaded: false,
            landingPage: false,
            features: [''],

            hostName: '',
            hostBio: '',
            hostImageURL: '',
            hostImg: false,
            hostImgUploaded: '',
            hostName2: '',
            hostBio2: '',
            hostImageURL2: '',
            hostImg2: false,
            hostImgUploaded2: '',

            forSale: false,
            prices: [],
            showTimeStamps: false,
            showSubscriberCount: false,
            modalOpen: false,
            confirmationEmail: EditorState.createWithContent(confirmationEmail),
            isPodcast: false,
            createPodcast: false,
            editPodcast: false,
            podcastError: '',
            doneProcessingPodcast: false,
            startProcessingPodcast:  false,
            podcastFeedVersion: null,
            autoSubmitPodcast: true
        };

        this.fileInputRef = null;
        this.hostImgInputRef = null;
        this.hostImgInputRef2 = null;
        this.currentImageRef = null;
        this.firebaseListener = null;
        this.addFeature = this.addFeature.bind(this);
        this.submit = this.submit.bind(this);
        this.onEditorStateChange = this.onEditorStateChange.bind(this);
    }

    componentDidMount() {
      let editorState, confirmEmailEditorState;
      const { id, soundcast } = this.props.history.location.state;
      const {title, subscribed, imageURL, short_description,
             long_description, landingPage,
             features, hostName, hostBio, hostImageURL, hostName2, hostBio2, hostImageURL2, forSale, prices, confirmationEmail, showSubscriberCount, showTimeStamps, isPodcast, episodes, itunesExplicit, itunesCategory, itunesImage, podcastFeedVersion, autoSubmitPodcast} = soundcast;
      // const {title0, subscribed0, imageURL0, short_description0,
      //        long_description0, landingPage0,
      //        features0, hostName0, hostBio0, hostImageURL0,
      //        forSale0, prices0, } = this.state;

      if(long_description) {
        let contentState = convertFromRaw(JSON.parse(long_description));
        editorState = EditorState.createWithContent(contentState);
      } else {
        editorState = EditorState.createEmpty();
      }

      if(confirmationEmail) {
        let confirmEmailText = convertFromRaw(JSON.parse(confirmationEmail.replace('[soundcast title]', title)));
        confirmEmailEditorState = EditorState.createWithContent(confirmEmailText);
      } else {
        confirmEmailEditorState = this.state.confirmationEmail;
      }
      this.setState({
        title,
        imageURL: imageURL ? imageURL : null,
        short_description,
        landingPage,
        hostName: hostName ? hostName : null,
        hostBio: hostBio ? hostBio : null,
        hostImageURL: hostImageURL ? hostImageURL : null,
        hostName2: hostName2 ? hostName2 : null,
        hostBio2: hostBio2 ? hostBio2 : null,
        hostImageURL2: hostImageURL2 ? hostImageURL2 : null,
        forSale: forSale ? forSale : false,
        long_description: editorState ,
        confirmationEmail: confirmEmailEditorState,
        showTimeStamps: showTimeStamps ? showTimeStamps : false,
        showSubscriberCount: showSubscriberCount ? showSubscriberCount : false,
        isPodcast: isPodcast ? isPodcast : false,
        episodes: episodes ? episodes : null,
        itunesCategory: itunesCategory ? itunesCategory : null,
        itunesExplicit: itunesExplicit ? itunesExplicit : false,
        itunesImage: itunesImage ? itunesImage : null,
        podcastFeedVersion: podcastFeedVersion ? podcastFeedVersion : null,
        autoSubmitPodcast: autoSubmitPodcast ? autoSubmitPodcast : true,
      });

      if(subscribed) {
        this.setState({
            subscribed
        })
      }
      if(features) {
        this.setState({
          features
        })
      }
      if(prices) {
        this.setState({
          prices
        })
      }
    }

    _uploadToAws (file, imageType) {
        const _self = this;
        const { id } = this.props;
        let data = new FormData();
        const splittedFileName = file.type.split('/');
        const ext = (splittedFileName)[splittedFileName.length - 1];
        let fileName = '';
        if(imageType == 'host') {
          fileName = `${id}-host-image-${moment().format('x')}.${ext}`;
        } else if(imageType == 'host2') {
          fileName= `${id}-host2-image-${moment().format('x')}.${ext}`;
        } else if(imageType == 'itunes') {
          fileName = `${id}-itunes-${moment().format('x')}.${ext}`;
        } else {
          fileName = `${id}-${moment().format('x')}.${ext}`;
        }

        data.append('file', file, fileName);
        // axios.post('http://localhost:3000/upload/images', data) // - alternative address (need to uncomment on backend)
        Axios.post('/api/upload', data)
            .then(function (res) {
                // POST succeeded...
                console.log('success upload to aws s3: ', res);

                //replace 'http' with 'https'
                let url = res.data[0].url;
                if(url.slice(0, 5) !== 'https') {
                    url = url.replace(/http/i, 'https');
                }

                if(imageType == 'host') {
                    _self.setState({hostImageURL: url});
                } else if(imageType == 'host2') {
                    _self.setState({hostImageURL2: url});
                } else if(imageType == 'itunes') {
                    _self.setState({itunesImage: url});
                } else {
                    _self.setState({imageURL: url});
                }
            })
            .catch(function (err) {
                // POST failed...
                console.log('ERROR upload to aws s3: ', err);
            });
    }

    setFileName (imageType, e) {
        // console.log('this.fileInputRef.files: ', this.fileInputRef.files);
        const that = this;
        var file, img, allowedFileTypes;
        var _URL = window.URL || window.webkitURL;
        if(imageType=='host' || imageType=='host2') {
            if(this.hostImgInputRef.files[0]) {
              if(imageType=='host2') {
                this.setState({
                  hostImgUploaded2: true,
                  hostImg2: true,
                  imageType: 'host2',
                });
              } else {
                this.setState({
                  hostImgUploaded: true,
                  hostImg: true,
                  imageType: 'host',
                });
              }
                allowedFileTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
                this.currentImageRef = this.hostImgInputRef.files[0];
                if(allowedFileTypes.indexOf(this.currentImageRef.type) < 0) {
                  alert('Only .png or .jpeg files are accepted. Please upload a new file.');
                  return;
                }
                that.handleModalOpen();
            }
        } else if(imageType=='itunes') {
            if(this.itunesInputRef.files[0]) {
              img = new Image();
              img.onload = function () {
                  var width  = img.naturalWidth  || img.width;
                  var height = img.naturalHeight || img.height;
                  if(width < 1400 || width > 3000) {
                    alert('iTunes/Google Play cover size must be between 1400 x 1400 px and 3000 x 3000 px. Please upload a new image.');
                    return;
                  } else {
                    that.setState({
                      itunesImgUploaded: true,
                      imageType: 'itunes',
                    });
                    allowedFileTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
                    that.currentImageRef = that.itunesInputRef.files[0];
                    if(allowedFileTypes.indexOf(that.currentImageRef.type) < 0) {
                      alert('Only .png or .jpeg files are accepted. Please upload a new file.');
                      return;
                    }
                    that.handleModalOpen();
                  }
              };
              img.src = _URL.createObjectURL(this.itunesInputRef.files[0]);
            }

        } else {
            // this._uploadToAws(this.fileInputRef.files[0], null)
            if (this.fileInputRef.files[0]) {
              img = new Image();
              img.onload = function () {
                  var width  = img.naturalWidth  || img.width;
                  var height = img.naturalHeight || img.height;
                  if(width < 1400 || width > 3000) {
                    alert('Soundcast cover size must be between 1400 x 1400 px and 3000 x 3000 px. Please upload a new image.');
                    return;
                  } else {
                    that.setState({
                      fileUploaded: true,
                      imageType: 'cover',
                    });
                    that.currentImageRef = that.fileInputRef.files[0];
                    allowedFileTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
                    if(allowedFileTypes.indexOf(that.currentImageRef.type) < 0) {
                      alert('Only .png or .jpeg files are accepted. Please upload a new file.');
                      return;
                    }
                    that.handleModalOpen();
                  }
              };
              img.src = _URL.createObjectURL(this.fileInputRef.files[0]);
            }
        }
    }

    submit (publish, noAlert) {
        const { title, imageURL, subscribed, short_description,
                long_description, landingPage,
                features, hostName, hostBio, hostImageURL, hostName2, hostBio2, hostImageURL2, forSale, prices, confirmationEmail, showSubscriberCount, showTimeStamps, itunesImage, itunesExplicit, itunesCategory, autoSubmitPodcast} = this.state;
        const { userInfo, history } = this.props;
        const that = this;

        this.firebaseListener = firebase.auth().onAuthStateChanged(function(user) {
              if (user && that.firebaseListener) {
                  const creatorID = user.uid;
                  const editedSoundcast = {
                      title,
                      short_description,
                      long_description: JSON.stringify(convertToRaw(long_description.getCurrentContent())),
                      confirmationEmail: JSON.stringify(convertToRaw(confirmationEmail.getCurrentContent())),
                      imageURL,
                      creatorID,
                      publisherID: userInfo.publisherID,
                      subscribed,
                      landingPage,
                      features,
                      hostName,
                      hostBio,
                      hostImageURL,
                      hostName2,
                      hostBio2,
                      hostImageURL2,
                      forSale,
                      prices,
                      showTimeStamps,
                      showSubscriberCount,
                      published: publish,
                      itunesImage,
                      itunesExplicit,
                      itunesCategory,
                      autoSubmitPodcast
                  };

                  // edit soundcast in database
                      firebase.database().ref(`soundcasts/${that.props.history.location.state.id}`)
                      .once('value')
                      .then(snapshot => {
                        const changedSoundcast = Object.assign({}, snapshot.val(), editedSoundcast);

                        firebase.database().ref(`soundcasts/${that.props.history.location.state.id}`)
                        .set(changedSoundcast)
                        .then(
                          res => {
                                Axios.post('/api/soundcast', {
                                  soundcastId: that.props.history.location.state.id,
                                  publisherId: that.props.userInfo.publisherID,
                                  title
                                })
                                .then(() => {
                                  if(!noAlert) {
                                    alert('Soundcast changes are saved.');
                                  }
                                  // history.goBack();
                                  that.firebaseListener = null;
                                });
                          },
                          err => {
                              console.log('ERROR add soundcast: ', err);
                          }
                        );
                      });
              } else {
                // alert('Soundcast saving failed. Please try again later.');
                // Raven.captureMessage('Soundcast saving failed!')
              }
        });
        this.firebaseListener && this.firebaseListener();
    }

    componentWillUnmount() {
      this.firebaseListener = null;
    }

    handleCheck() {
        const {landingPage} = this.state;
        this.setState({
            landingPage: !landingPage,
        })
    }

    setFeatures(i, event) {
        const features = [...this.state.features];
        features[i] = event.target.value;
        this.setState({
            features
        })
    }

    deleteFeature(i, event) {
        const features = [...this.state.features];
        if(features.length >= 2) {
            features.splice(i, 1);
        } else {
            features[0] = '';
        }
        this.setState({
            features
        })
    }

    addFeature() {
        const features = [...this.state.features];
        features.push('');
        this.setState({
            features
        })
    }

    handleChargeOption() {
        const {forSale} = this.state;
        if(!forSale) {
            this.setState({
                forSale: !forSale,
                prices: [{paymentPlan: '', billingCycle: 'monthly', price: ''}]
            })
        } else {
            this.setState({
                forSale: !forSale,
                prices: []
            })
        }
    }

    onEditorStateChange(editorState) {
        this.setState({
            long_description: editorState,
        })
    }

    onConfirmationStateChange(editorState) {
        this.setState({
          confirmationEmail: editorState,
        })
    }

    renderAdditionalInputs() {
        const featureNum = this.state.features.length;
        const {long_description, hostImageURL, hostImgUploaded, landingPage, forSale, prices, instructor2Input, hostName2} = this.state;
        const that = this;
        return (
            <div style={{marginTop: 25, marginBottom: 25,}}>
                <span style={{...styles.titleText, marginBottom: 5}}>
                  What Listeners Will Get
                </span>
                <span>
                  <i>
                    {` (list the main benefits and features of this soundcast)`}
                  </i>
                </span>
                <div style={{width: '100%', marginBottom: 30}}>
                    {
                        this.state.features.map((feature, i) => {
                            return (
                                <div key={i} style={styles.inputTitleWrapper}>
                                  <span style={styles.titleText}>{`${i + 1}. `}</span>
                                  <input
                                      type="text"
                                      style={{...styles.inputTitle, width: '85%'}}
                                      placeholder={'e.g. Learn how to analyze financial statement with ease'}
                                      onChange={this.setFeatures.bind(this,i)}
                                      value={this.state.features[i]}
                                  />
                                  <span
                                      style={{marginLeft: 5, cursor: 'pointer'}}
                                      onClick={this.deleteFeature.bind(this, i)}>
                                    <i className="fa fa-times " aria-hidden="true"></i>
                                  </span>
                                </div>
                            )
                        })
                    }
                    <div>
                      <span style={styles.addFeature} onClick={this.addFeature}>
                        Add
                      </span>
                    </div>
                </div>
                <span style={{...styles.titleText, marginBottom: 5}}>
                    Long Description
                </span>
                <div>
                    <Editor
                      editorState = {long_description}
                      editorStyle={styles.editorStyle}
                      wrapperStyle={styles.wrapperStyle}
                      onEditorStateChange={this.onEditorStateChange}
                    />
                </div>
                <div>
                    <span style={styles.titleText}>
                        Instructor Name
                    </span>
                    <div style={{...styles.inputTitleWrapper, width: '35%'}}>
                      <input
                          type="text"
                          style={styles.inputTitle}
                          placeholder={''}
                          onChange={(e) => {this.setState({hostName: e.target.value})}}
                          value={this.state.hostName}
                      />
                    </div>
                </div>
                <div>
                    <div >
                        <span style={styles.titleText}>
                            Instructor Bio
                        </span>
                    </div>
                    <textarea
                        style={styles.inputDescription}
                        placeholder={'Who will be teaching?'}
                        onChange={(e) => {this.setState({hostBio: e.target.value})}}
                        value={this.state.hostBio}
                    >
                    </textarea>
                </div>
                <div style={{height: 150, width: '100%'}}>
                    <div style={{marginBottom: 10}}>
                        <span style={styles.titleText}>
                            Instructor Profile Picture
                        </span>
                    </div>
                    <div style={{...styles.hostImage, backgroundImage: `url(${hostImageURL})`}}>

                    </div>
                    <div style={styles.loaderWrapper}>
                        <div style={{...styles.inputFileWrapper, marginTop: 0}}>
                            <input
                                type="file"
                                name="upload"
                                id="upload_hidden_cover_2"
                                accept="image/*"
                                onChange={this.setFileName.bind(this, 'host')}
                                style={styles.inputFileHidden}
                                ref={input => this.hostImgInputRef = input}
                            />
                            {
                              hostImgUploaded &&
                              <div>
                                <span>{this.hostImgInputRef.files[0].name}</span>
                                <span style={styles.cancelImg}
                                  onClick={() => {
                                    that.setState({hostImgUploaded: false, hostImageURL: ''});
                                    document.getElementById('upload_hidden_cover_2').value = null;
                                  }}>Cancel</span>
                              </div>
                              ||
                              !hostImgUploaded &&
                              <div>
                                <button
                                    onClick={() => {document.getElementById('upload_hidden_cover_2').click();}}
                                    style={{...styles.uploadButton, backgroundColor:  Colors.mainOrange}}
                                >
                                    Upload
                                </button>
                                <span style={styles.fileTypesLabel}>.jpg or .png files accepted</span>
                              </div>
                            }
                        </div>
                    </div>
                </div>
                {
                  !hostName2 && !instructor2Input &&
                  <div
                    onClick={() => that.setState({
                      instructor2Input: true
                    })}
                    style={{...styles.addFeature, marginLeft: 0, marginBottom: 25}}>
                   <span >Add A Second Instructor</span>
                  </div>
                  || null
                }
                {
                  (hostName2 || instructor2Input) &&
                  this.renderInstructor2Input()
                  || null
                }
                { landingPage &&
                    <div>
                      <span style={styles.titleText}>Pricing</span>
                      <div style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                          <Toggle
                            id='charging-status'
                            aria-labelledby='charging-label'
                            // label="Charge subscribers for this soundcast?"
                            checked={this.state.forSale}
                            onChange={this.handleChargeOption.bind(this)}
                            // thumbSwitchedStyle={styles.thumbSwitched}
                            // trackSwitchedStyle={styles.trackSwitched}
                            // style={{fontSize: 20, width: '50%'}}
                          />
                          <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Charge for this soundcast</span>
                      </div>
                      {
                        forSale &&
                      <div style={{width: '100%,'}}>
                        {
                            prices.map((price, i) => {
                                const priceTag = price.price == 'free' ? 0 : price.price;
                                return (
                                  <div key={i} className='' style={{marginBottom: 10}}>
                                    <div style={{width: '100%'}}>
                                      <span style={styles.titleText}>{`${i + 1}. `}</span>
                                      <div style={{width: '45%', display: 'inline-block', marginRight: 10,}}>
                                        <span>Payment Plan Name</span>
                                        <input
                                          type="text"
                                          style={styles.inputTitle}
                                          name="paymentPlan"
                                          placeholder='e.g. 3 day access, monthly subscription, etc'
                                          onChange={this.handlePriceInputs.bind(this, i)}
                                          value={prices[i].paymentPlan}
                                        />
                                      </div>
                                      <div style={{width: '25%', display: 'inline-block', marginRight: 10,}}>
                                        <span>Billing</span>
                                        <select
                                          type="text"
                                          style={styles.inputTitle}
                                          name="billingCycle"
                                          onChange={this.handlePriceInputs.bind(this, i)}
                                          value={prices[i].billingCycle}
                                        >
                                          <option value='one time'>one time purchase</option>
                                          <option value='rental'>one time rental</option>
                                          <option value='monthly'>monthly subscription</option>
                                          <option value='quarterly'>quarterly subscription</option>
                                          <option value='annual'>annual subscription</option>

                                        </select>
                                      </div>
                                      <div style={{width: '20%', display: 'inline-block',}}>
                                        <span>Price</span>
                                        <div>
                                          <span style={{fontSize: 18}}>{`$ `}</span>
                                          <input
                                            type="text"
                                            style={{...styles.inputTitle, width: '85%'}}
                                            name="price"
                                            placeholder={''}
                                            onChange={this.handlePriceInputs.bind(this, i)}
                                            value={priceTag}
                                          />
                                        </div>
                                      </div>
                                      <span
                                        style={{marginLeft: 5, cursor: 'pointer', fontSize:20}}
                                        onClick={this.deletePriceOption.bind(this, i)}>
                                                      <i className="fa fa-times " aria-hidden="true"></i>
                                      </span>
                                    </div>
                                    {
                                      prices[i].billingCycle == 'rental' &&
                                      <div className='col-md-12' style={{marginTop: 10, marginBottom: 15, }}>
                                        <div className='col-md-4 col-md-offset-6' style={{marginRight: 10,}}>
                                          <span>Rental period</span>
                                          <div>
                                            <input
                                              type="text"
                                              style={{...styles.inputTitle, width: '70%'}}
                                              name="rentalPeriod"
                                              placeholder={'2'}
                                              onChange={this.handlePriceInputs.bind(this, i)}
                                              value={prices[i].rentalPeriod}
                                            />
                                            <span style={{fontSize: 18,}}>{` days`}</span>
                                          </div>
                                        </div>
                                      </div>
                                      || null
                                    }
                                  </div>
                                )
                            } )
                        }
                        <div
                            onClick={this.addPriceOption.bind(this)}
                            style={styles.addFeature}
                        >
                            Add another price option
                        </div>
                      </div>
                      }
                    </div>
                }

            </div>
        )

    }

    renderInstructor2Input() {
      const {hostName2, hostBio2, hostImageURL2, hostImgUploaded2} = this.state;
      return (
        <div>
          <div>
              <span style={styles.titleText}>
                  Instructor 2 Name
              </span>
              <div style={{...styles.inputTitleWrapper, width: '35%'}}>
                <input
                    type="text"
                    style={styles.inputTitle}
                    placeholder={''}
                    onChange={(e) => {this.setState({hostName2: e.target.value})}}
                    value={this.state.hostName2}
                />
              </div>
          </div>
          <div>
              <div >
                  <span style={styles.titleText}>
                      Instructor 2 Bio
                  </span>
              </div>
              <textarea
                  style={styles.inputDescription}
                  placeholder={'Who will be teaching?'}
                  onChange={(e) => {this.setState({hostBio2: e.target.value})}}
                  value={this.state.hostBio2}
              >
              </textarea>
          </div>
          <div style={{height: 150, width: '100%'}}>
              <div style={{marginBottom: 10}}>
                  <span style={styles.titleText}>
                      Instructor 2 Profile Picture
                  </span>
              </div>
              <div style={{...styles.hostImage, backgroundImage: `url(${hostImageURL2})`}}>

              </div>
              <div style={styles.loaderWrapper}>
                  <div style={{...styles.inputFileWrapper, marginTop: 0}}>
                      <input
                          type="file"
                          name="upload"
                          id="upload_hidden_cover_3"
                          accept="image/*"
                          onChange={this.setFileName.bind(this, 'host2')}
                          style={styles.inputFileHidden}
                          ref={input => this.hostImgInputRef = input}
                      />
                      {
                        hostImgUploaded2 &&
                        <div>
                          <span>{this.hostImgInputRef.files[0].name}</span>
                          <span style={styles.cancelImg}
                            onClick={() => {
                              that.setState({hostImgUploaded2: false, hostImageURL2: ''});
                              document.getElementById('upload_hidden_cover_3').value = null;
                            }}>Cancel</span>
                        </div>
                        ||
                        !hostImgUploaded2 &&
                        <div>
                          <button
                              onClick={() => {document.getElementById('upload_hidden_cover_3').click();}}
                              style={{...styles.uploadButton, backgroundColor:  Colors.mainOrange}}
                          >
                              Upload
                          </button>
                          <span style={styles.fileTypesLabel}>.jpg or .png files accepted</span>
                        </div>
                      }
                  </div>
              </div>
          </div>
        </div>
      )
    }

    handlePriceInputs(i, e) {
        let prices = [...this.state.prices];
        prices[i][e.target.name] = e.target.value;
        this.setState({
            prices
        })
    }

    addPriceOption() {
        let prices = [...this.state.prices];
        const price = {
            paymentPlan: '',
            billingCycle: 'monthly',
            price: ''
        }
        prices.push(price);
        this.setState({
            prices
        })
    }

    deletePriceOption(i) {
        let prices = [...this.state.prices];
        if(prices.length > 1) {
          prices.splice(i, 1);
        } else {
            prices[0] = {
                paymentPlan: '',
                billingCycle: 'monthly',
                price: ''
            }
        }
        this.setState({
            prices
        })
    }

    handleModalOpen() {
      this.setState({
        modalOpen: true,
        fileCropped: false,
      })
    }

    handleModalClose() { // image upload is cancelled
      this.setState({
        modalOpen: false,
      });
      if(this.state.hostImg) {
        this.setState({
          hostImgUploaded: false,
        });
        document.getElementById('upload_hidden_cover_2').value = null;
      } else if(this.state.hostImg2) {
        this.setState({
          hostImgUploaded2: false,
        });
        document.getElementById('upload_hidden_cover_3').value = null;
      } else if(this.state.itunesImage) {
        this.setState({
          itunesUploaded: false,
        });
        document.getElementById('upload_hidden_iTunes').value = null;
      } else {
        this.setState({
          fileUploaded: false,
        });
        document.getElementById('upload_hidden_cover').value = null;
      }
    }

    uploadViaModal(fileBlob, imageType) {
      this.setState({
        fileCropped: true,
        modalOpen: false,
      });
      if(imageType == 'host') {
        this.setState({
          hostImgUploaded: true,
        })
      } else if(imageType == 'host2') {
        this.setState({
          hostImgUploaded2: true,
        })
      } else if(imageType == 'itunes') {
        console.log('itunes block called');
        this.setState({
          itunesUploaded: true,
        })
      } else {
        this.setState({
          fileUploaded: true,
        })
      }
      this._uploadToAws(fileBlob, imageType);
    }

    createPodcast() {
      const that = this;
      const { id, soundcast } = this.props.history.location.state;
      const {itunesImage, itunesExplicit, itunesCategory, podcastFeedVersion, autoSubmitPodcast} = this.state;
      if(!itunesCategory || itunesCategory.length == 0) {
        alert('Please pick at least one category before submitting.');
        return;
      }
      if(!itunesImage) {
        alert('Please upload a cover image before submitting.');
        return;
      }
      this.submit(true, true);
      this.setState({
        startProcessingPodcast: true,
        doneProcessingPodcast: false,
      });
      Axios.post('/api/create_feed', {
        soundcastId: id,
        itunesExplicit,
        itunesImage,
        itunesCategory,
        autoSubmitPodcast
      })
      .then(response => {
        that.setState({
          startProcessingPodcast: false,
          doneProcessingPodcast: true,
        });
        if(podcastFeedVersion) {
          alert('Podcast feed information has been edited!');
        } else {
          alert('Podcast feed has been created!');
        }
      })
      .catch(err => {
        that.setState({
          startProcessingPodcast: false,
          doneProcessingPodcast: true,
          podcastError: err.toString(),
        });
        console.log(err);
      });
    }

    renderPodcastInput() {
      const {itunesExplicit, itunesImage, itunesCategory, imageURL, itunesUploaded, podcastFeedVersion, autoSubmitPodcast} = this.state;
      const { id } = this.props;
      const that = this;
      const img1 = new Image();
      img1.onload = function(){
        var height = img1.naturalHeight || img1.height;
        var width = img1.naturalWidth || img1.width;
        if(height >= 1400 && height <= 3000 && !itunesImage) {
          that.setState({
            itunesImage: imageURL
          });
        }
      }
      img1.src = imageURL;
      // console.log('itunesCategory: ', itunesCategory);
      const categoryObj = itunesCategories;
      const itunesArr = [];
      for (let key in categoryObj) {
        if(categoryObj[key].sub) {
          categoryObj[key].sub.forEach(sub => {
            itunesArr.push(`${categoryObj[key].name} - ${sub}`);
          });
        } else {
          itunesArr.push(categoryObj[key].name);
        }
      }
      itunesArr.unshift('');
      return (
        <div>
          <div style={{...styles.titleText, paddingBottom: 15}}>Your Podcast RSS feed URL is: <a href={`https://mysoundwise.com/rss/${id}`} style={{color: Colors.mainOrange}}>{`https://mysoundwise.com/rss/${id}`}</a></div>
          {
            !podcastFeedVersion &&
            <div style={{marginBottom: 40}}>
              <div style={{...styles.titleText, paddingBottom: 15}}>Podcast submission </div>
              <MuiThemeProvider>
                <RadioButtonGroup name="podcast submission"
                  defaultSelected={autoSubmitPodcast}
                  onChange={(e,value)=> {
                    that.setState({
                      autoSubmitPodcast: value
                    });
                  }}
                >
                  <RadioButton
                    value={true}
                    label='Submit the feed to iTunes & Google Play for me'
                    labelStyle={styles.titleText}
                    style={styles.radioButton}
                  />
                  <RadioButton
                    value={false}
                    label="I'll submit it myself"
                    labelStyle={styles.titleText}
                    style={styles.radioButton}
                  />
                </RadioButtonGroup>
              </MuiThemeProvider>
              <hr />
            </div>
            || null
          }
          <div style={{...styles.titleText, paddingBottom: 15}}>The material contains explicit language</div>
          <MuiThemeProvider>
            <RadioButtonGroup name="Contains explicit language"
              defaultSelected={itunesExplicit}
              onChange={(e,value)=> {
                that.setState({
                  itunesExplicit: value
                });
              }}
            >
              <RadioButton
                value={true}
                label='Yes'
                labelStyle={styles.titleText}
                style={styles.radioButton}
              />
              <RadioButton
                value={false}
                label="No"
                labelStyle={styles.titleText}
                style={styles.radioButton}
              />
            </RadioButtonGroup>
          </MuiThemeProvider>
          <div style={{height: 150,}}>
              <div style={styles.image}>
                <img src={itunesImage} />
              </div>
              <div style={styles.loaderWrapper}>
                  <div style={{...styles.titleText, marginLeft: 10}}>
                      iTunes/Google Play cover art
                  </div>
                  <div style={{...styles.fileTypesLabel, marginLeft: 10}}>
                  At least 1400 x 1400 pixels in .jpg or .png format. Must not exceed 3000 x 3000 pixels
                  </div>
                  <div style={{...styles.inputFileWrapper, marginTop: 0}}>
                      <input
                          type="file"
                          name="upload"
                          id="upload_hidden_iTunes"
                          accept="image/*"
                          onChange={this.setFileName.bind(this, 'itunes')}
                          style={styles.inputFileHidden}
                          ref={input => this.itunesInputRef = input}
                      />
                      {
                        itunesUploaded &&
                        <div>
                          <span>{this.itunesInputRef.files[0].name}</span>
                          <span style={styles.cancelImg}
                            onClick={() => {
                              that.setState({itunesUploaded: false, itunesImage: ''});
                              document.getElementById('upload_hidden_iTunes').value = null;
                            }}>Cancel</span>
                        </div>
                        ||
                        !itunesUploaded &&
                        <div>
                          <button
                              onClick={() => {document.getElementById('upload_hidden_iTunes').click();}}
                              style={{...styles.uploadButton, backgroundColor:  Colors.link}}
                          >
                              Upload
                          </button>
                        </div>
                      }
                  </div>
              </div>
          </div>
          <div style={styles.soundcastSelectWrapper}>
              <div style={{...styles.titleText, marginLeft: 10,}}><span>iTunes Category 1 (required)</span><span style={{color: 'red'}}>*</span></div>
              <select
                value = {itunesCategory && itunesCategory[0] && itunesCategory[0]  || ''}
                style={styles.soundcastSelect}
                onChange={(e) => {
                  const itunesCategory = this.state.itunesCategory || [];
                  itunesCategory[0] = e.target.value;
                  that.setState({itunesCategory});
                }}>
                {
                    itunesArr.map((cat, i) => {
                        return (
                            <option value={cat} key={i}>{cat}</option>
                        );
                    })
                }
              </select>
          </div>
          <div style={styles.soundcastSelectWrapper}>
              <div style={{...styles.titleText, marginLeft: 10,}}><span>iTunes Category 2</span></div>
              <select
                value = {itunesCategory && itunesCategory[1] && itunesCategory[1] || ''}
                style={styles.soundcastSelect}
                onChange={(e) => {
                  const itunesCategory = this.state.itunesCategory;
                  itunesCategory[1] = e.target.value;
                  that.setState({itunesCategory});
                }}>
                {
                    itunesArr.map((cat, i) => {
                        return (
                            <option value={cat} key={i}>{cat}</option>
                        );
                    })
                }
              </select>
          </div>
          <div style={styles.soundcastSelectWrapper}>
              <div style={{...styles.titleText, marginLeft: 10,}}><span>iTunes Category 3</span></div>
              <select
                value = {itunesCategory && itunesCategory[2] && itunesCategory[2]  || ''}
                style={styles.soundcastSelect}
                onChange={(e) => {
                  const itunesCategory = this.state.itunesCategory;
                  itunesCategory[2] = e.target.value;
                  that.setState({itunesCategory});
                }}>
                {
                    itunesArr.map((cat, i) => {
                        return (
                            <option value={cat} key={i}>{cat}</option>
                        );
                    })
                }
              </select>
          </div>
        </div>
      )
    }

    render() {
        const { imageURL, title, subscribed, fileUploaded, landingPage, modalOpen, hostImg, isPodcast, createPodcast, editPodcast, episodes, forSale, imageType, startProcessingPodcast, doneProcessingPodcast, podcastError, podcastFeedVersion, hostImg2} = this.state;
        const { userInfo, history, id } = this.props;
        const that = this;

        return (
          <MuiThemeProvider >
            <div className='padding-30px-tb' style={{}}>
              <ImageCropModal
                open={modalOpen}
                handleClose={this.handleModalClose.bind(this)}
                upload={this.uploadViaModal.bind(this)}
                hostImg={hostImg}
                hostImg2={hostImg2}
                imageType={imageType}
                file={this.currentImageRef}
              />
              <div className='padding-bottom-20px'>
                  <span className='title-medium '>
                      Edit Soundcast
                  </span>
              </div>
              <div className=''  style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                  <Toggle
                    id='landing-status'
                    aria-labelledby='landing-label'
                    checked={this.state.landingPage}
                    onChange={this.handleCheck.bind(this)}
                  />
                  <span id='landing-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>This is a public soundcast</span>
                {
                  landingPage &&
                  <ul className="nav nav-pills col-md-6" style={{marginLeft: 25}}>
                    <li role="presentation"  ><a target="_blank" href={`https://mysoundwise.com/soundcasts/${id}`} style={{backgroundColor: 'transparent'}}><span style={{fontSize: 18, fontWeight: 600, color: Colors.mainOrange}}>View Landing Page</span></a></li>
                    <li role="presentation" ><a target="_blank" href={`https://mysoundwise.com/signup/soundcast_user/${id}`}><span style={{fontSize: 18, fontWeight: 600, color: Colors.link}}>View Signup Form</span></a></li>
                  </ul>
                  || null
                }
              </div>
              <div className="row">
                  <div className="col-lg-9 col-md-9 col-sm-12 col-xs-12">
                      <div style={{marginBottom: 15}}>
                        <span style={styles.titleText}>Title</span>
                        <span style={{...styles.titleText, color: 'red'}}>*</span>
                        <span style={{fontSize: 17, marginBottom: 15,}}><i> (60 characters max)</i></span>
                      </div>
                      <ValidatedInput
                          type="text"
                          styles={styles.inputTitle}
                          wrapperStyle={styles.inputTitleWrapper}
                          placeholder={'Soundcast title'}
                          onChange={(e) => {this.setState({title: e.target.value})}}
                          value={this.state.title}
                          validators={[minLengthValidator.bind(null, 1), maxLengthValidator.bind(null, 60)]}
                      />
                      <div style={{marginTop: 20,}}>
                        <span style={{...styles.titleText, marginTop: 20,}}>
                            Short Description
                        </span>
                        <span style={{...styles.titleText, color: 'red'}}>*</span>
                        <span style={{fontSize: 17}}>
                            <i> (300 characters max)</i>
                        </span>
                      </div>
                      <div style={styles.inputTitleWrapper}>
                        <textarea
                            type="text"
                            style={styles.inputDescription}
                            placeholder={'A short description of this soundcast (300 characters max)'}
                            onChange={(e) => {this.setState({short_description: e.target.value})}}
                            value={this.state.short_description}
                        />
                      </div>
                      <div style={{height: 150,}}>
                          <div style={styles.image}>
                            <img src={imageURL} />
                          </div>
                          <div style={styles.loaderWrapper}>
                              <div style={{...styles.titleText, marginLeft: 10}}>
                                  Soundcast cover art
                              </div>
                              <div style={{...styles.fileTypesLabel, marginLeft: 10}}>
                                  (Required: square image between 1400 x 1400 pixels and 3000 x 3000 pixels, in .jpeg or .png format)
                              </div>
                              <div style={{...styles.inputFileWrapper, marginTop: 0}}>
                                  <input
                                      type="file"
                                      name="upload"
                                      id="upload_hidden_cover"
                                      accept="image/*"
                                      onChange={this.setFileName.bind(this, null)}
                                      style={styles.inputFileHidden}
                                      ref={input => this.fileInputRef = input}
                                  />
                                  {
                                    fileUploaded &&
                                    <div>
                                      <span>{this.fileInputRef.files[0].name}</span>
                                      <span style={styles.cancelImg}
                                        onClick={() => {
                                          that.setState({fileUploaded: false, imageURL: ''});
                                          document.getElementById('upload_hidden_cover').value = null;
                                        }}>Cancel</span>
                                    </div>
                                    ||
                                    !fileUploaded &&
                                    <div>
                                      <button
                                          onClick={() => {document.getElementById('upload_hidden_cover').click();}}
                                          style={{...styles.uploadButton, backgroundColor:  Colors.link}}
                                      >
                                          Upload
                                      </button>
                                    </div>
                                  }
                              </div>
                          </div>
                      </div>
                      {
                          this.renderAdditionalInputs()
                      }
                      <div style={{paddingTop: 20, paddingBottom: 25,}}>
                        <span style={{...styles.titleText, marginTop: 20,}}>
                            Other Settings
                        </span>
                        <div style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                            <Toggle
                              id='charging-status'
                              aria-labelledby='charging-label'
                              // label="Charge subscribers for this soundcast?"
                              checked={this.state.showTimeStamps}
                              onChange={() => {
                                      const showTimeStamps = !that.state.showTimeStamps;
                                      that.setState({showTimeStamps});
                                    }}
                              // thumbSwitchedStyle={styles.thumbSwitched}
                              // trackSwitchedStyle={styles.trackSwitched}
                              // style={{fontSize: 20, width: '50%'}}
                            />
                            <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Show episode publication dates</span>
                        </div>
                        <div style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                            <Toggle
                              id='charging-status'
                              aria-labelledby='charging-label'
                              // label="Charge subscribers for this soundcast?"
                              checked={this.state.showSubscriberCount}
                              onChange={() => {
                                      const showSubscriberCount = !that.state.showSubscriberCount;
                                      that.setState({showSubscriberCount});
                                    }}
                            />
                            <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Show subscriber count</span>
                        </div>
                        {
                          !isPodcast && !forSale && episodes &&
                          <div style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                              <Toggle
                                id='charging-status'
                                aria-labelledby='charging-label'
                                checked={this.state.createPodcast}
                                onChange={() => {
                                        const createPodcast = !that.state.createPodcast;
                                        that.setState({createPodcast});
                                      }}
                              />
                              {
                                podcastFeedVersion &&
                                <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Edit the podcast feed</span>
                                ||
                                <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Create a podcast feed</span>
                              }

                          </div>
                          || null
                        }
                        {
                          createPodcast &&
                          <div>
                            {this.renderPodcastInput()}
                            <div className="col-lg-5 col-md-6 col-sm-8 col-xs-12 center-col" >
                                {
                                  startProcessingPodcast && !doneProcessingPodcast &&
                                  <div  style={{marginTop: 25, width: '100%', marginBottom: 25}}>
                                    <div className='' style={{ fontSize: 18, width: '100%'}}>
                                      <span>Submitting feed information...</span>
                                    </div>
                                    <div className='col-md-12' style={{marginTop: 10}}>
                                      <Dots style={{}} color="#727981" size={32} speed={1}/>
                                    </div>
                                  </div>
                                  ||
                                  <div>
                                    <OrangeSubmitButton
                                        styles={{width: '100%'}}
                                        label={podcastFeedVersion && "Save Edited Podcast Feed" || "Create Podcast Feed"}
                                        onClick={this.createPodcast.bind(this)}
                                    />
                                    {
                                    podcastError && doneProcessingPodcast &&
                                    <div style={{fontSize: 17, marginTop: 10, color: 'red'}}>
                                     {podcastError}
                                    </div>
                                    }
                                  </div>
                                }
                            </div>
                          </div>
                          || null
                        }
                        {
                          isPodcast &&
                          <div style={{marginTop: 15, marginBottom: 25, display: 'flex', alignItems: 'center'}}>
                              <Toggle
                                id='charging-status'
                                aria-labelledby='charging-label'
                                checked={this.state.editPodcast}
                                onChange={() => {
                                        const editPodcast = !that.state.editPodcast;
                                        that.setState({editPodcast});
                                      }}
                              />
                              <span id='charging-label' style={{fontSize: 20, fontWeight: 800, marginLeft: '0.5em'}}>Modify the podcast feed</span>
                          </div>
                          || null
                        }
                        {
                          isPodcast && editPodcast && this.renderPodcastInput()
                          || null
                        }
                      </div>
                      {/*Invitations*/}
                      <div style={{borderTop: '0.3px solid #9b9b9b', paddingTop: 25, borderBottom: '0.3px solid #9b9b9b', paddingBottom: 25,}}>
                        <div>
                          <span style={styles.titleText}>
                            Subsciption Confirmation Message
                          </span>
                          <Editor
                            editorState = {this.state.confirmationEmail}
                            editorStyle={styles.editorStyle}
                            wrapperStyle={styles.wrapperStyle}
                            onEditorStateChange={this.onConfirmationStateChange.bind(this)}
                          />
                        </div>
                      </div>
                      <div className='row'>
                        <div className="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                            <OrangeSubmitButton
                                label="Save Draft"
                                styles={{backgroundColor: Colors.link, borderColor: Colors.link}}
                                onClick={()=> that.submit(false, false)}
                            />
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                            <OrangeSubmitButton
                                label="Publish"
                                onClick={()=> that.submit(true, false)}
                            />
                        </div>
                        <div className="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                            <TransparentShortSubmitButton
                                label="Cancel"
                                onClick={() => {
                                  history.goBack();
                                }}
                            />
                        </div>
                      </div>
                  </div>
              </div>
            </div>
          </MuiThemeProvider>
        );
    }
};

EditSoundcast.propTypes = {
    userInfo: PropTypes.object,
    history: PropTypes.object,
};

const styles = {
    titleText: {
        fontSize: 20,
        fontWeight: 600,
    },
    inputTitleWrapper: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    inputTitle: {
        height: 40,
        backgroundColor: Colors.mainWhite,
        width: '100%',
        fontSize: 18,
        borderRadius: 4,
        marginBottom: 0,
        marginTop: 5,
    },
    inputDescription: {
        height: 80,
        backgroundColor: Colors.mainWhite,
        width: '100%',
        fontSize: 18,
        borderRadius: 4,
        marginTop: 10,
        marginBottom: 20
    },
    editorStyle: {
        padding: '5px',
        borderRadius: 4,
        fontSize: 16,
        height: '300px',
        width: '100%',
        backgroundColor: Colors.mainWhite,
      },
    wrapperStyle: {
        borderRadius: 4,
        marginBottom: 25,
        marginTop: 15,
    },
    image: {
        width: 133,
        height: 133,
        float: 'left',
        backgroundColor: Colors.mainWhite,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: Colors.lightGrey,
    },
    hostImage: {
        width: 100,
        height: 100,
        float: 'left',
        borderRadius: '50%',
        backgroundColor: Colors.mainWhite,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: Colors.lightGrey,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
    },
    loaderWrapper: {
        height: 133,
        paddingTop: 20,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 20,
        width: 'calc(100% - 133px)',
        float: 'left',
    },
    checkbox: {
        display: 'inline-block',
        width: '20px',
        height: '20px',
        verticalAlign: 'middle',
        // WebkitAppearance: 'none',
        // appearance: 'none',
        borderRadius: '1px',
        borderColor: 'black',
        borderWidth: 1,
        boxSizing: 'border-box',
        marginLeft: 10,
    },
    addFeature: {
        fontSize: 20,
        marginLeft: 10,
        color: Colors.link,
        cursor: 'pointer',
    },

    // TODO: move to separate component if functions are the same as in create_episode
    inputFileWrapper: {
        margin: 10,
        width: 'calc(100% - 20px)',
        height: 60,
        // backgroundColor: Colors.mainWhite,
        overflow: 'hidden',
        marginBottom: 0,
        float: 'left',
    },
    inputFileHidden: {
        position: 'absolute',
        display: 'block',
        overflow: 'hidden',
        width: 0,
        height: 0,
        border: 0,
        padding: 0,
    },
    inputFileVisible: {
        backgroundColor: 'transparent',
        width: 'calc(100% - 70px)',
        height: 40,
        float: 'left',
    },
    uploadButton: {
        backgroundColor: Colors.link,
        width: 80,
        height: 30,
        // float: 'left',
        color: Colors.mainWhite,
        fontSize: 18,
        border: 0,
        marginTop: 5

    },
    cancelImg: {
      color: Colors.link,
      marginLeft: 20,
      fontSize: 16,
      cursor: 'pointer'
    },
    fileTypesLabel: {
        fontSize: 16,
        marginLeft: 0,
        display: 'block',
    },
    radioButton: {
      marginBottom: 16,
    },
    thumbSwitched: {
      backgroundColor: Colors.link,
    },
    trackSwitched: {
      backgroundColor: Colors.link,
    },
    soundcastSelectWrapper: {
        height: 92,
        backgroundColor: Colors.mainWhite,
        marginTop: 15,
        paddingTop: 15,
    },
    soundcastSelect: {
        backgroundColor: 'transparent',
        width: 'calc(100% - 20px)',
        height: 35,
        marginLeft: 10,
        marginRight: 10,
        marginTop: 5,
        fontSize: 16
    },
};