import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Axios from 'axios';
import firebase from 'firebase';
import { Link } from 'react-router-dom';

import {
  minLengthValidator,
  maxLengthValidator,
} from '../../../helpers/validators';
import { inviteListeners } from '../../../helpers/invite_listeners';

import ValidatedInput from '../../../components/inputs/validatedInput';
import Colors from '../../../styles/colors';
import commonStyles from '../../../styles/commonStyles';
import {
  OrangeSubmitButton,
  TransparentShortSubmitButton,
} from '../../../components/buttons/buttons';

export default class Payouts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      payouts: [
        {
          createdAt: '',
          amount: 0,
        },
      ],
    };
  }

  componentDidMount() {
    if (this.props.userInfo.publisher) {
      this.retrievePayouts(this.props.userInfo.publisher.id);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.userInfo.publisher &&
      nextProps.userInfo.publisher !== this.props.userInfo.publisher
    ) {
      this.retrievePayouts(nextProps.userInfo.publisher.id);
    }
  }

  retrievePayouts(publisherId) {
    const that = this;
    const filter = {
      params: {
        filter: {
          where: {
            publisherId,
            // date: {
            //     lte: moment().format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'),
            // },
          },
        },
      },
    };

    Axios.get('https://mysoundwise.com/api/payouts', filter)
      .then(res => {
        const payouts = res.data;
        payouts.sort((a, b) => {
          return (
            moment(b.createdAt).format('X') - moment(a.createdAt).format('X')
          );
        });
        that.setState({
          payouts,
        });
      })
      .catch(err => {
        console.log('error retrieving payouts: ', err);
      });
  }

  render() {
    const { userInfo } = this.props;
    return (
      <div className="padding-30px-tb" style={{ minHeight: 700 }}>
        <div className="padding-bottom-20px">
          <span className="title-medium ">Publisher</span>
          <Link to={`/publishers/${userInfo.publisherID}`}>
            <span
              className="text-medium"
              style={{ marginLeft: 15, color: Colors.mainOrange }}
            >
              <strong>View Publisher Page</strong>
            </span>
          </Link>
        </div>
        <ul className="nav nav-pills">
          <li role="presentation">
            <Link to="/dashboard/publisher">
              <span style={{ fontSize: 15, fontWeight: 600 }}>Profile</span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/transactions">
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                Transactions
              </span>
            </Link>
          </li>
          <li role="presentation" className="active">
            <Link
              style={{ backgroundColor: 'transparent' }}
              to="/dashboard/publisher/payouts"
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: Colors.mainOrange,
                }}
              >
                Payouts
              </span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/promotions">
              <span style={{ fontSize: 15, fontWeight: 600 }}>Promotions</span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/settings">
              <span style={{ fontSize: 15, fontWeight: 600 }}>Settings</span>
            </Link>
          </li>
          <li role="presentation">
            <Link to="/dashboard/publisher/integrations">
              <span style={{ fontSize: 15, fontWeight: 600 }}>Integration</span>
            </Link>
          </li>
        </ul>
        {(this.state.payouts.length > 0 && (
          <row>
            <div
              className="col-md-12 col-sm-12 col-xs-12 table-responsive"
              style={styles.tableWrapper}
            >
              <table className="table table-hover">
                <thead>
                  <tr style={styles.tr}>
                    <th style={{ ...styles.th }}>DATE</th>
                    <th style={{ ...styles.th }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.payouts.map((payout, i) => {
                    return (
                      <tr key={i} style={styles.tr}>
                        <td style={{ ...styles.td }}>
                          {payout.createdAt.slice(0, 10)}
                        </td>
                        <td style={{ ...styles.td }}>{`$${payout.amount /
                          100}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </row>
        )) || (
          <row>
            <div className="col-md-12 " style={{ marginTop: 40 }}>
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
  tableWrapper: { ...commonStyles.tableWrapper },
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
