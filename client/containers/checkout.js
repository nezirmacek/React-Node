import React, {Component} from 'react';
import Axios from 'axios';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link, Redirect } from 'react-router-dom';
import Dots from 'react-activity/lib/Dots';
import { withRouter } from 'react-router';
import * as firebase from 'firebase';

import { SoundwiseHeader } from '../components/soundwise_header';
import {deleteCart} from '../actions/index';
import Colors from '../styles/colors';

let stripe, elements;

class _Checkout extends Component {
    constructor(props) {
        super(props)
        this.state={
            coupon: '',
            couponError: '',
            paymentError: '',
            submitDisabled: false,
            number: '',
            cvc: '',
            exp_month: '',
            exp_year: '',
            totalPay: 0,
            paid: false,
            startPaymentSubmission: false
        }
        this.onSubmit = this.onSubmit.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.handleCoupon = this.handleCoupon.bind(this)
        this.stripeTokenHandler = this.stripeTokenHandler.bind(this)
        this.renderProgressBar = this.renderProgressBar.bind(this)
        this.addCourseToUser = this.addCourseToUser.bind(this)
    }

    componentDidMount() {
        stripe = Stripe.setPublishableKey('pk_live_Ocr32GQOuvASmfyz14B7nsRP')
        this.setState({
            totalPay: this.props.shoppingCart.reduce((cum, course) => {
                return cum + course.price
            }, 0) * 100 // in cents
        })
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            totalPay: nextProps.shoppingCart.reduce((cum, course) => {
                return cum + course.price
            }, 0) * 100 // in cents
        })
    }

    handleChange(e) {
        this.setState({
            [e.target.name]: e.target.value
        })
    }

    handleCoupon() {
        const that = this;

        firebase.database().ref('/coupons').once('value')
            .then(snapshot => {
                const coupons = snapshot.val();
                const today = Date.now();
                const expiration = Date.parse(coupons[that.state.coupon].expiration) || today;

                if(coupons[that.state.coupon] && today <= expiration) {
                    const coupon = coupons[that.state.coupon];
                    const discountedPrice = that.props.shoppingCart.reduce((cumm, course) => {

                        if(course.id === coupon.course_id) {

                            return cumm + course.price - coupon.discount / 100 * course.price
                        } else {
                            return cumm + course.price
                        }
                    }, 0);

                    that.setState({
                        totalPay:  Math.floor(discountedPrice * 100) //in cents
                    });

                    var updates = {};
                    updates['/coupons/' + that.state.coupon + '/count'] = coupon.count + 1
                    firebase.database().ref().update(updates)

                    if(that.state.totalPay === 0) { //if it's free course, then no need for credit card info. Push course to user and then redirect
                        that.addCourseToUser(that.props.userInfo.stripe_id)
                    }


                } else if(coupons[that.state.coupon] && today > Date.parse(coupons[that.state.coupon].expiration)) {
                    that.setState({
                        couponError: 'This coupon has expired'
                    })
                } else {
                    that.setState({
                        couponError: 'This coupon does not exist'
                    })
                }
            })
    }

    async onSubmit(event) {
        event.preventDefault();

        this.setState({
            startPaymentSubmission: true
        });
        const {number, cvc} = this.state;
        const exp_month = Number(this.state.exp_month);
        const exp_year = Number(this.state.exp_year);
        this.setState({ submitDisabled: true, paymentError: null });

        Stripe.card.createToken({number, cvc, exp_month, exp_year}, this.stripeTokenHandler);
    }

    stripeTokenHandler(status, response) {
        const amount = this.state.totalPay;
        const email = this.props.userInfo.email;
        const that = this;

        if(response.error) {
            this.setState({
                paymentError: response.error.message,
                submitDisabled: false,
                startPaymentSubmission: false
            })
        } else {
            Axios.post('/api/charge', {
                amount,
                source: response.id,
                currency: 'usd',
                receipt_email: email,
                description: that.props.shoppingCart[0].name,
                statement_descriptor: 'Soundwise Audio Course'
            })
                .then(function (response) {

                    const paid = response.data.paid; //boolean
                    const customer = response.data.customer;

                    if(paid) {  // if payment made, push course to user data, and redirect to a thank you page
                        that.setState({
                            paid,
                            startPaymentSubmission: false
                        });

                        that.addCourseToUser(customer) //push course to user profile and redirect
                    }
                })
                .catch(function (error) {
                    console.log('error from stripe: ', error)
                    that.setState({
                        paymentError: 'Your payment is declined :( Please check your credit card information.',
                        startPaymentSubmission: false
                    })
                })
        }
    }

    addCourseToUser(customer) {
        const that = this;
        const userId = firebase.auth().currentUser.uid;
        const course = this.props.shoppingCart[0];

        let sectionProgress = {};
        course.modules.forEach(module => {
            module.sections.forEach(section => {
                sectionProgress[section.section_id] = {
                    playProgress: 0,
                    completed: false,
                    timesRepeated: 0
                }
            })
        });

        course.sectionProgress = sectionProgress;

        const updates = {};
        updates['/users/' + userId + '/courses/' + course.id] = course;
        // store stripe customer ID info: (only works with real credit cards)
        if(customer !== undefined && customer.length > 0) {
            updates['/users/' + userId + '/stripe_id'] = customer
        }
        updates['/courses/' + course.id + '/users/' + userId] = userId;
        firebase.database().ref().update(updates);

        Axios.post('/api/email_signup', { //handle mailchimp api call
            firstName: that.props.userInfo.firstName,
            lastName: that.props.userInfo.lastName,
            email: that.props.userInfo.email,
            courseID: course.id
        })
            .then(() => {
                that.props.deleteCart();
                that.props.history.push('/confirmation');
            })
            .catch((err) => {
                that.props.deleteCart();
                that.props.history.push('/confirmation');
            })

    }

    renderProgressBar() {
        if(this.state.startPaymentSubmission) {
            return (
                <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '1em'}}>
                    <Dots style={{display: 'flex'}} color="#727981" size={32} speed={1}/>
                </div>
            )
        }
    }

    render() {
        const items_num = this.props.shoppingCart.length;
        // const subtotal = this.props.shoppingCart.reduce((cumm, course) => {
        //   return cumm + course.price
        // }, 0)
        const subtotal = Math.floor(this.state.totalPay) / 100;

        return (
            <div>
                <section className="bg-white builder-bg" id="subscribe-section6">
                    <div className='container' style={{paddingBottom: '70px'}}>
                        <div className="row equalize ">
                            <div className="col-md-6 center-col col-sm-12 ">
                                <div style={styles.totalRow}>
                                    <div style={styles.totalWrapper}>
                                        <div style={styles.totalText}>Total:</div>
                                        <div style={styles.totalPriceText}>{`$${subtotal}`}</div>
                                    </div>
                                </div>
                                <form onSubmit={this.onSubmit}>

                                    {/*card number*/}
                                    <div style={styles.relativeBlock}>
                                        {/*<label className='title-large alt-font  font-weight-400 margin-three-top margin-three-bottom sm-margin-six-bottom xs-no-margin xs-padding-bottom-20px xs-title-large display-block tz-text'>*/}
                                            {/*Card Number*/}
                                        {/*</label>*/}
                                        <input
                                            onChange={this.handleChange}
                                            required
                                            className='border-radius-4'
                                            size='20'
                                            type='text'
                                            name='number'
                                            placeholder="Card Number"
                                            style={styles.input}
                                        />
                                        <img src="../images/card_types.png" style={styles.cardsImage} />
                                    </div>

                                    {/*Expiration*/}
                                    <div className=''>
                                        {/*month*/}
                                        <div style={styles.selectBlock} className="border-radius-4" >
                                            <label style={styles.selectLabel}>Exp Month</label>
                                            <select
                                                onChange={this.handleChange}
                                                name="exp_month"
                                                id="expiry-month"
                                                style={styles.select}
                                            >
                                                <option value="1">Jan (01)</option>
                                                <option value="2">Feb (02)</option>
                                                <option value="3">Mar (03)</option>
                                                <option value="4">Apr (04)</option>
                                                <option value="5">May (05)</option>
                                                <option value="6">June (06)</option>
                                                <option value="7">July (07)</option>
                                                <option value="8">Aug (08)</option>
                                                <option value="9">Sep (09)</option>
                                                <option value="10">Oct (10)</option>
                                                <option value="11">Nov (11)</option>
                                                <option value="12">Dec (12)</option>
                                            </select>
                                        </div>

                                        {/*year*/}
                                        <div style={styles.selectBlock} className="border-radius-4" >
                                            <label style={styles.selectLabel}>Exp Year</label>
                                            <select
                                                onChange={this.handleChange}
                                                name="exp_year"
                                                style={styles.select}
                                            >
                                                <option value="2017">2017</option>
                                                <option value="2018">2018</option>
                                                <option value="2019">2019</option>
                                                <option value="2020">2020</option>
                                                <option value="2021">2021</option>
                                                <option value="2022">2022</option>
                                                <option value="2023">2023</option>
                                                <option value="2024">2024</option>
                                                <option value="2025">2025</option>
                                                <option value="2026">2026</option>
                                                <option value="2027">2027</option>
                                                <option value="2028">2028</option>
                                            </select>
                                        </div>

                                        {/*cvv/cvc*/}
                                        <input
                                            onChange={this.handleChange}
                                            required
                                            className='border-radius-4'
                                            size='4'
                                            type='password'
                                            name='cvc'
                                            placeholder="CVC"
                                            style={Object.assign({}, styles.input, styles.cvc)}
                                        />
                                    </div>

                                    {/*button*/}
                                    <div style={styles.buttonWrapper}>
                                        {
                                            this.state.paymentError &&
                                            <span style={{color: 'red'}}>{ this.state.paymentError }</span>
                                        }
                                        <button
                                            className='contact-submit btn propClone btn-3d text-white width-100 builder-bg tz-text'
                                            type='submit'
                                            style={styles.button}
                                        >
                                            PAY NOW
                                        </button>
                                        <div style={styles.securedTextWrapper}>
                                            <i className="ti-lock" style={styles.securedTextIcon} />
                                            Transactions are secure and encrypted.
                                        </div>
                                        <div style={styles.stripeImageWrapper}>
                                            <img src="../images/powered_by_stripe.png" style={styles.stripeImage}/>
                                        </div>
                                        {this.renderProgressBar()}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        )
    }
}

const styles = {
    totalRow: {
        borderTop: `1px solid ${Colors.mainGrey}`,
        height: 22,
    },
    totalWrapper: {
        float: 'right',
        marginRight: 30,
        fontWeight: 'bold',
        fontSize: 14,
        color: Colors.fontBlack,
    },
    totalText: {
        width: 40,
        marginRight: 50,
        float: 'left',
    },
    totalPriceText: {
        width: 53,
        float: 'right',
        textAlign: 'right',
    },
    cardsImage: {
        position: 'absolute',
        right: 4,
        top: 10,
        width: 179,
        height: 26,
    },
    input: {
        height: 46,
        fontSize: 14,
        margin: '40px 0 0 0',
    },
    selectBlock: {
        width: '35%',
        height: 46,
        float: 'left',
        marginTop: 9,
        border: `1px solid ${Colors.mainGrey}`,
        paddingLeft: 10,
        marginRight: '5%',
    },
    selectLabel: {
        fontWeight: 'normal',
        display: 'block',
        marginBottom: 0,
        color: Colors.fontBlack,
        fontSize: 14,
    },
    select: {
        border: 0,
        backgroundColor: Colors.mainWhite,
        padding: 0,
        margin: 0,
        color: Colors.fontGrey,
        fontSize: 14,
        position: 'relative',
        right: 3,
    },
    cvc: {
        width: '20%',
        marginTop: 9,
    },
    buttonWrapper: {
        margin: '20px 0 0 0',
    },
    stripeImageWrapper: {
        backgroundColor: Colors.mainOrange,
        overflow: 'hidden',
        position: 'relative',
        width: 238,
        height: 32,
        margin: '10px auto',
        float: 'left',
    },
    stripeImage: {
        width: 238,
        height: 52,
        position: 'relative',
        bottom: 10,
    },
    button: {
        height: 46,
        backgroundColor: Colors.mainOrange,
        fontSize: 14,
    },
    securedTextWrapper: {
        marginTop: 15,
        float: 'left',
    },
    securedTextIcon: {
        fontSize: 16,
    },
    securedText: {
        fontSize: 14,
    },

    relativeBlock: {
        position: 'relative',
    },
};

const mapStateToProps = state => {
    const { userInfo, isLoggedIn } = state.user;
    const { shoppingCart } = state.checkoutProcess;
    return {
        userInfo,
        isLoggedIn,
        shoppingCart
    }
};

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ deleteCart }, dispatch);
}

const Checkout_worouter = connect(mapStateToProps, mapDispatchToProps)(_Checkout);
export const Checkout = withRouter(Checkout_worouter);
