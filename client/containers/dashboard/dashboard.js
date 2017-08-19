/**
 * Created by developer on 01.08.17.
 */
import React, {Component} from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as _ from 'lodash';

import {SoundwiseHeader} from '../../components/soundwise_header';
import CreateEpisode from './components/create_episode';
import SoundcastsManaged from './components/soundcasts_managed';
import AddSoundcast from "./components/add_soundcast";
import Subscribers from "./components/subscribers";


const verticalMenuItems = [
    {
        path: 'soundcasts',
        label: 'Soundcasts',
        iconClass: 'headphones',
        isMenuItemVisible: true,
        Component: SoundcastsManaged,
    },
    {
        path: 'add_episode',
        label: 'Add Episode',
        iconClass: 'plus-square-o',
        isMenuItemVisible: true,
        Component: CreateEpisode,
    },
    {
        path: 'add_soundcast',
        isMenuItemVisible: false,
        Component: AddSoundcast,
    },
    {
        path: '',
        label: 'Analytics',
        iconClass: 'bar-chart',
        isMenuItemVisible: true,
        Component: SoundcastsManaged,
    },
    {
        path: 'subscribers',
        label: 'Subscribers',
        iconClass: 'users',
        isMenuItemVisible: true,
        Component: Subscribers,
    },
    {
        path: '',
        label: 'Announcements',
        iconClass: 'bullhorn',
        isMenuItemVisible: true,
        Component: SoundcastsManaged,
    },
];

class _Dashboard extends Component {
    constructor (props) {
        super(props);

        if (!props.isLoggedIn || !props.userInfo.admin) {
            this.props.history.push('/signin');
        }
    }

    componentWillReceiveProps (nextProps) {
        if (!nextProps.userInfo.admin) {
            nextProps.history.push('/signin');
        }
    }

    render() {
        const { userInfo, history, match } = this.props;
        const currentTab = _.find(verticalMenuItems, {path: match.params.tab});

        return (
            <div style={{position: 'absolute', height: '100%', width: '100%'}}>
                <SoundwiseHeader />
                <div className="row" style={{minHeight: '100%', width: '100%'}}>
                    <div className="col-lg-2 col-md-3 col-sm-4 col-xs-6" style={styles.verticalMenu}>
                        {
                            verticalMenuItems.map((item, i) => {
                                if (item.isMenuItemVisible) {
                                    return (
                                        <div
                                            style={match.params.tab === item.path && styles.activeVerticalMenuItem || styles.verticalMenuItem}
                                            key={i}
                                            onClick={() => match.params.tab !== item.path && history.push(`/dashboard/${item.path}`)}
                                        >
                                            <i
                                                className={`fa fa-${item.iconClass}`}
                                                style={{...styles.verticalMenuItemIcon, ...(match.params.tab === item.path && {color: '#F76B1C'} || {})}}
                                            ></i>
                                            {item.label}
                                        </div>
                                    );
                                } else {
                                    return null;
                                }
                            })
                        }
                    </div>
                    <div className="col-lg-10 col-md-9 col-sm-8 col-xs-6" style={styles.contentWrapper}>
                        {
                            currentTab
                            &&
                            <currentTab.Component
                                userInfo={userInfo}
                                history={history}
                                id={match.params.id}
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
        paddingLeft: 19,
        cursor: 'pointer',
    },
    activeVerticalMenuItem: {
        width: '100%',
        height: 75,
        fontSize: 16,
        paddingTop: 25,
        paddingLeft: 19,
        backgroundColor: '#f5f5f5',
        color: '#F76B1C',
        borderLeft: '3px solid #F76B1C',
    },
    verticalMenuItemIcon: {
        fontSize: '20px',
        color: '#687178',
        marginRight: 10,
        width: 25,
    },
    contentWrapper: {
        backgroundColor: '#f5f5f5',
        minHeight: '650',
        paddingTop: 10,
        paddingRight: 20,
        paddingBottom: 10,
        paddingLeft: 20,
        marginBottom: 0
    },
};

function mapDispatchToProps(dispatch) {
    return bindActionCreators({  }, dispatch);
}


const mapStateToProps = state => {
    const { userInfo, isLoggedIn } = state.user;
    return {
        userInfo, isLoggedIn
    }
};

export const Dashboard = connect(mapStateToProps, mapDispatchToProps)(_Dashboard);
