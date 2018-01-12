import React, {Component} from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as firebase from 'firebase';
import Axios from 'axios';

// import { openSignupbox, openConfirmationbox, addCourseToCart } from '../actions/index';
import { withRouter } from 'react-router';
import {orange50} from 'material-ui/styles/colors';

export default class SoundcastFooter extends Component {
  constructor(props) {
    super(props);

    this.checkOut = this.checkOut.bind(this);
    this.addSoundcastToUser = this.addSoundcastToUser.bind(this);
  }

  addSoundcastToUser() {
  }

  checkOut() {

  }

  render() {
    const {soundcast} = this.props;
    let displayedPrice = 'Free';
    let {prices} = soundcast;

    if(prices && prices.length > 0 && prices[0].price != 'free' ) {
        prices = prices.map(price => {
            if(price.billingCycle == 'one time' || price.billingCycle == 'monthly' ) {
                price.measure = price.price;
            } else if(price.billingCycle == 'quarterly') {
                price.measure = Math.floor(price.price / 3 *100) / 100;
            } else if(price.billingCycle == 'annual') {
                price.measure = Math.floor(price.price / 12 *100) / 100;
            }
            return price;
        });

        prices.sort((a, b) => (
            a.measure - b.measure
        ));
        // console.log('prices: ', prices);
        displayedPrice = prices[0].billingCycle == 'one time' ?
                            `$${prices[0].measure}` :
                            `$${prices[0].measure} / month`;
    }

    return (
            <section className=" builder-bg border-none" id="callto-action2" style={{backgroundColor: '#F76B1C', paddingBottom: '90px', paddingTop: '90px'}}>
                <div className="container">
                    <div className="row equalize">
                        <div className="col-md-12 col-sm-12 col-xs-12 text-center" style={{height: "46px"}}>
                            <div className="display-inline-block sm-display-block vertical-align-middle margin-five-right sm-no-margin-right sm-margin-ten-bottom tz-text alt-font text-white title-large sm-title-large xs-title-large">{`Get This Soundcast for ${displayedPrice}`}</div>
                            <a onClick={this.props.openModal} className="btn-large btn text-white highlight-button-white-border btn-circle"><span className="tz-text" >Get Access</span></a>
                        </div>
                    </div>
                </div>
            </section>
    )
  }
}

