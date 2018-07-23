import React, {Component} from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Axios from 'axios';
import firebase from 'firebase';
import {Link} from 'react-router-dom';

import {
  minLengthValidator,
  maxLengthValidator,
} from '../../../helpers/validators';
import {inviteListeners} from '../../../helpers/invite_listeners';

import ValidatedInput from '../../../components/inputs/validatedInput';
import Colors from '../../../styles/colors';
import {
  OrangeSubmitButton,
  TransparentShortSubmitButton,
} from '../../../components/buttons/buttons';

export default class Promotions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      coupons: [],
    };
  }

  componentDidMount() {
    if (this.props.userInfo.publisher) {
      const publisherId = this.props.userInfo.publisher.id;
      this.retrieveCoupons(publisherId);
    }
  }

  retrieveCoupons(publisherId) {
    Axios.get('/api/coupon', {params: {filter: {publisherId: publisherId}}})
      .then(res => {
        this.setState({coupons: res.data});
      })
      .catch(err => {
        console.log('error retrieving: ', err);
      });
  }

  render() {
    const {userInfo} = this.props;
    return (
      <div className="padding-30px-tb" style={{minHeight: 700}}>
        <div className="padding-bottom-20px">
          <span className="title-medium ">Publisher</span>
          <Link to={`/publishers/${userInfo.publisherID}`}>
            <span
              className="text-medium"
              style={{marginLeft: 15, color: Colors.mainOrange}}
            >
              <strong>View Publisher Page</strong>
            </span>
          </Link>
        </div>
        <ul className="nav nav-pills">
          <li role="presentation">
            <Link to="/dashboard/publisher">
              <span style={{fontSize: 15, fontWeight: 600}}>Profile</span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/transactions">
              <span style={{fontSize: 15, fontWeight: 600}}>Transactions</span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/payouts">
              <span style={{fontSize: 15, fontWeight: 600}}>Payouts</span>
            </Link>
          </li>
          <li role="presentation" className="active">
            <Link
              style={{backgroundColor: 'transparent'}}
              to="/dashboard/publisher/promotions"
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: Colors.mainOrange,
                }}
              >
                Promotions
              </span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/settings">
              <span style={{fontSize: 15, fontWeight: 600}}>Settings</span>
            </Link>
          </li>
        </ul>
        {(this.state.coupons.length > 0 && (
          <row>
            <div
              className="col-md-12 col-sm-12 col-xs-12 table-responsive"
              style={styles.tableWrapper}
            >
              <table className="table table-hover">
                <thead>
                  <tr style={styles.tr}>
                    <th style={{...styles.th}}>DATE</th>
                    <th style={{...styles.th}}>COUPON CODE</th>
                    <th style={{...styles.th}}>SOUNDCAST TITLE</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.coupons.map((coupon, i) => {
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{...styles.td}}>
                          {moment()
                            .millisecond(Number('1532289881'))
                            .format('YYYY-MM-DD')}
                        </td>
                        <td style={{...styles.td}}>{coupon.coupon}</td>
                        <td style={{...styles.td}}>{`${
                          coupon.soundcastTitle
                        }`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </row>
        )) || (
          <row>
            <div className="col-md-12 " style={{marginTop: 40}}>
              <div
                className="title-small padding-40px-tb"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: Colors.mainWhite,
                }}
              >
                <span>There're no payouts to show.</span>
              </div>
            </div>
          </row>
        )}
      </div>
    );
  }
}

const styles = {
  titleText: {
    fontSize: 16,
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
    fontSize: 16,
    borderRadius: 4,
    marginBottom: 0,
  },
  inputDescription: {
    height: 80,
    backgroundColor: Colors.mainWhite,
    width: '100%',
    fontSize: 16,
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 20,
  },
  tableWrapper: {
    marginTop: 25,
    backgroundColor: Colors.mainWhite,
    padding: 25,
    overflow: 'auto',
    maxHeight: 650,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
    borderBottomStyle: 'solid',
  },
  th: {
    fontSize: 16,
    color: Colors.fontGrey,
    // height: 35,
    fontWeight: 'regular',
    verticalAlign: 'middle',
    wordWrap: 'break-word',
  },
  td: {
    color: Colors.softBlack,
    fontSize: 16,
    // height: 40,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    verticalAlign: 'middle',
    wordWrap: 'break-word',
  },
};
