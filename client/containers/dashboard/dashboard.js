/**
 * Created by developer on 01.08.17.
 */
import React, {Component} from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as _ from 'lodash';
import firebase from 'firebase';
import moment from 'moment';
import Axios from 'axios';

import {SoundwiseHeader} from '../../components/soundwise_header';
import CreateEpisode from './components/create_episode';
import SoundcastsManaged from './components/soundcasts_managed';
import AddSoundcast from "./components/add_soundcast";
import CreateBundle from "./components/create_bundle";
import Subscribers from "./components/subscribers";
import Subscriber from "./components/subscriber";
import Announcements from "./components/announcements";
import Analytics from "./components/analytics";
import EditSoundcast from './components/edit_soundcast';
import Publisher from './components/publisher';
import EditEpisode from './components/edit_episode';
import Soundcast from './components/soundcast';
import {handleContentSaving, setFeedVerified, setChargeState} from '../../actions/index';
const verticalMenuItems = [
    {
        path: 'soundcasts',
        label: 'Soundcasts',
        iconClass: 'headset',
        isMenuItemVisible: true,
        Component: SoundcastsManaged,
    },
    {
        path: 'edit',
        label: 'edit',
        isMenuItemVisible: false,
        Component: EditSoundcast,
    },
    {
        path: 'soundcast',
        label: 'edit',
        isMenuItemVisible: false,
        Component: Soundcast,
    },
    {
        path: 'add_episode',
        label: 'Add Episode',
        iconClass: 'settings_voice',
        isMenuItemVisible: true,
        Component: CreateEpisode,
    },
    {
        path: 'add_soundcast',
        isMenuItemVisible: false,
        Component: AddSoundcast,
    },
    {
        path: 'create_bundle',
        isMenuItemVisible: false,
        Component: CreateBundle,
    },
    {
        path: 'edit_bundle',
        isMenuItemVisible: false,
        Component: CreateBundle,
    },
    {
        path: 'analytics',
        label: 'Analytics',
        pro: true,
        iconClass: 'assessment',
        isMenuItemVisible: true,
        Component: Analytics,
    },
    {
        path: 'subscribers',
        label: 'Subscribers',
        pro: true,
        iconClass: 'people',
        isMenuItemVisible: true,
        Component: Subscribers,
    },
    {
        path: 'subscriber',
        isMenuItemVisible: false,
        Component: Subscriber,
    },
    {
        path: 'messages',
        label: 'Messages',
        pro: true,
        iconClass: 'message',
        isMenuItemVisible: true,
        Component: Announcements,
    },
    {
        path: 'publisher',
        label: 'Publisher',
        iconClass: 'work',
        isMenuItemVisible: true,
        Component: Publisher,
    },
    {
        path: 'edit_episode',
        label: 'edit_episode',
        isMenuItemVisible: false,
        Component: EditEpisode,
    },
];

class _Dashboard extends Component {
    constructor (props) {
        super(props);
        this.state = {
            userInfo: {},
        }
    }

    componentDidMount() {
        const that = this;
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                if(that.props.userInfo.admin) {
                    that.setState({
                        userInfo: that.props.userInfo
                    });
                }
            } else {
                that.props.history.push('/signin');
            }
        });
    }
    componentWillReceiveProps (nextProps) {
        const that = this;
        if (!nextProps.userInfo.admin || !nextProps.isLoggedIn) {
            nextProps.history.push('/signin');
        }
        if(nextProps.userInfo.admin) {
            this.setState({
                userInfo: nextProps.userInfo
            });
        }
        const publisher    = nextProps.userInfo.publisher   || this.props.userInfo.publisher;
        const publisherID  = nextProps.userInfo.publisherID || this.props.userInfo.publisherID;
        const feedVerified = nextProps.feedVerified || this.props.feedVerified;
        const chargeState  = nextProps.chargeState  || this.props.chargeState;
        if (!this.runningParseFeedRequest && feedVerified && publisher && publisherID) {
          this.runningParseFeedRequest = true;
        	const { feedUrl } = feedVerified;
        	const reqObj = {
        		feedUrl,
        		userId: that.props.userInfo.id,
        		publisherId: publisherID,
        		publisherName: publisher.name,
        		importFeedUrl: true,
        	};
        	Axios.post('/api/parse_feed', reqObj).then(res => {
        		// if (res.data === 'Success_import') {
        			that.props.setFeedVerified(false);
        		// }
        	}).catch(err => {
        		console.log('import feed request failed', err, err && err.response && err.response.data);
        		alert('Hmm...there is a problem importing feed. Please try again later.');
        		that.props.setFeedVerified(false);
        	});
        }
        if (!this.runningChargeStateRequest && publisherID && chargeState) { // set already paid data (same block from soundwise_checkout.js:handlePaymentSuccess)
          this.runningChargeStateRequest = true;
        	const { plan, frequency, promoCodeError, promoCode, trialPeriod, charge } = chargeState;
        	firebase.database().ref(`publishers/${publisherID}/plan`).set(plan);
        	firebase.database().ref(`publishers/${publisherID}/frequency`).set(frequency);
        	firebase.database().ref(`publishers/${publisherID}/current_period_end`).set(charge.data.current_period_end);
        	firebase.database().ref(`publishers/${publisherID}/auto_renewal`).set(true);
        	firebase.database().ref(`publishers/${publisherID}/subscriptionID`).set(charge.data.id);
        	if(trialPeriod) {
        		firebase.database().ref(`publishers/${publisherID}/trialEnd`).set(moment().add(trialPeriod, 'days').format('X'));
        	}
        	firebase.database().ref(`publishers/${publisherID}/stripe_customer_id`).set(charge.data.customer);
        	if(promoCode && !promoCodeError && !trialPeriod) {
        		firebase.database().ref(`publishers/${publisherID}/coupon`).set({
        			code: promoCode,
        			expires_on: charge.data.current_period_end
        		});
        	}
        	that.props.setChargeState(null);
        }
    }

    render() {
        const { history, match, isLoggedIn, handleContentSaving, content_saved, feedVerified } = this.props;
        let userInfo = this.state.userInfo;
        let plan, proUser;
        if(userInfo.publisher && userInfo.publisher.plan) {
            plan = userInfo.publisher.plan;
            proUser = userInfo.publisher.current_period_end > moment().format('X') ? true : false;
        }
        if(userInfo.publisher && userInfo.publisher.beta) {
            proUser = true;
        }

        const currentTab = _.find(verticalMenuItems, {path: match.params.tab});

        return (
            <div className=''
              >
                <SoundwiseHeader />
                { feedVerified && <div class="importing-feed-overlay">
                            <div>Importing feed... Please wait</div></div> }
                <div className="" style={{minHeight: '100%', width: '100%'}}>
                    <div className="col-lg-2 col-md-3 col-sm-3 col-xs-3" style={styles.verticalMenu}>
                        {
                            verticalMenuItems.map((item, i) => {
                                if (item.isMenuItemVisible) {
                                    return (
                                        <div className='col-md-12'
                                            style={match.params.tab === item.path && styles.activeVerticalMenuItem || styles.verticalMenuItem}
                                            key={i}
                                            onClick={() => match.params.tab !== item.path && history.push(`/dashboard/${item.path}`)}
                                        >
                                            <div className='col-md-1 col-sm-2 col-xs-12'>
                                              {
                                                match.params.tab === item.path &&
                                                <i className='material-icons'
                                                    style={styles.activeVerticalMenuItemIcon}
                                                >{item.iconClass}</i>
                                                ||
                                                <i className='material-icons'
                                                    style={styles.verticalMenuItemIcon}
                                                >{item.iconClass}</i>
                                              }
                                            </div>
                                            <div className='col-md-9 col-sm-9 hidden-xs'>
                                               <span>{item.label}</span>
                                               {
                                                item.pro && !proUser &&
                                                <span style={{fontSize:10,fontWeight: 800, color: 'red', marginLeft: 5}}>PLUS</span>
                                                || <span></span>
                                               }
                                            </div>
                                        </div>
                                    );
                                } else {
                                    return null;
                                }
                            })
                        }
                    </div>
                    <div className="col-lg-10 col-md-9 col-sm-9 col-xs-9" style={styles.contentWrapper}>
                        {
                            currentTab
                            &&
                            <currentTab.Component
                                {...this.props}
                                userInfo={userInfo}
                                history={history}
                                id={match.params.id}
                                handleContentSaving={handleContentSaving}
                                content_saved={content_saved}
                            />
                            ||
                            null
                        }
                    </div>
                </div>
            </div>
        );
    }
}

const styles = {
    verticalMenu: {
        backgroundColor: '#fff',
        paddingRight: 0,
    },
    verticalMenuItem: {
        width: '100%',
        height: 75,
        color: '#687178',
        fontSize: 16,
        paddingTop: 25,
        // paddingLeft: 19,
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    activeVerticalMenuItem: {
        width: '100%',
        height: 75,
        fontSize: 16,
        paddingTop: 25,
        // paddingLeft: 19,
        backgroundColor: '#f5f5f5',
        color: '#F76B1C',
        borderLeft: '3px solid #F76B1C',
        fontWeight: 'bold',
    },
    verticalMenuItemIcon: {
        fontSize: '20px',
        color: '#687178',
        marginRight: 5,
        width: 25,
    },
    activeVerticalMenuItemIcon: {
        fontSize: '20px',
        color: '#F76B1C',
        marginRight: 5,
        width: 25,
    },
    contentWrapper: {
        backgroundColor: '#f5f5f5',
        minHeight: '950',
        paddingTop: 10,
        paddingRight: 20,
        paddingBottom: 10,
        paddingLeft: 20,
        marginBottom: 0
    },
};

const mapStateToProps = state => {
    const { userInfo, isLoggedIn, content_saved } = state.user;
    return {
        userInfo, isLoggedIn, content_saved,
        feedVerified: state.setFeedVerified.feedVerified,
        chargeState: state.setChargeState.chargeState,
    }
};

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ handleContentSaving, setFeedVerified, setChargeState }, dispatch);
}

export const Dashboard = connect(mapStateToProps, mapDispatchToProps)(_Dashboard);
