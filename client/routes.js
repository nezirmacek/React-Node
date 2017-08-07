import React, {Component} from 'react';
import { BrowserRouter as Router, Route, Link, Switch } from 'react-router-dom';
import firebase from 'firebase';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {Helmet} from 'react-helmet';
import { browserHistory } from 'react-router';
import Butter from 'buttercms';
const butter = Butter('4ac51854da790bffc513d38911d2b677c19481f8');
import injectTapEventPlugin from 'react-tap-event-plugin';
// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();

import { config, awsConfig } from '../config';
import { loadCourses, subscribeToCategories, signinUser } from './actions/index';
import Page from './components/page';
import About from './components/about';
import Referral from './components/referral';
import TrialRequest from './components/trialrequest'
import CreatorTerms from './components/creator_terms';
import TermsFreeContent from './components/terms_free_content_May2017';
import { OrderConfirmation } from './components/order_confirmation';
import {AppSignup} from './containers/app_signup';
import {AppSignin} from './containers/app_signin';
import {Courses} from './containers/courses';
import {MyCourses} from './containers/mycourses';
import {Course} from './containers/course_page';
import {Staged_Course} from './containers/staged_course_page';
import {Course_Purchased} from './containers/course_page_purchased';
import {Cart} from './containers/cart/cart';
import {Checkout} from './containers/checkout';
import {CoursesCatalog} from './containers/courses_catalog/courses_catalog';
import {Dashboard} from './containers/dashboard/dashboard';
import NotFound from './components/page_404';
import PassRecovery from './components/pass_recovery';
import ScrollToTop from './components/scroll_to_top';

class _Routes extends Component {
  constructor(props) {
    super(props);

    props.subscribeToCategories();
  }

  componentDidMount() {
    const that = this
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        const userId = user.uid
        firebase.database().ref('users/' + userId)
        .on('value', snapshot => {
            if (snapshot.val()) {
                const firstName = snapshot.val().firstName
                const lastName = snapshot.val().lastName
                const email = snapshot.val().email
                const courses = snapshot.val().courses
                const pic_url = snapshot.val().pic_url || ""
                const stripe_id = snapshot.val().stripe_id
                that.props.signinUser({firstName, lastName, email, courses, pic_url, stripe_id})
            }
        })
      }
    })

    firebase.database().ref('courses')
            .on('value', snapshot => {
              this.props.loadCourses(snapshot.val())
            })

    butter.post.list({page: 1, page_size: 10}).then(function(response) {
      console.log(response)
    })

    butter.content.retrieve(['homepage_headline']).then(function(response) {
      console.log(response)
    })

      // new AWS.Credentials(awsConfig);

  }

  render() {
    return (
      <Router history = { browserHistory }>
        <ScrollToTop>
          <div>
            <Helmet>
              <meta property="og:type" content="website"/>
              <meta property="og:url" content="https://mysoundwise.com/" />
              <meta property="og:title" content="Soundwise"/>
              <meta property="fb:app_id" content='1726664310980105' />
              <meta property="og:description" content="Soundwise is a audio content management system that helps real estate trainers and brokers disseminate trainings and informational updates in audio to real estate agents."/>
              <meta property="og:image" content="https://mysoundwise.com/images/soundwise_homepage.png" />
              <title>Soundwise: the most efficient way to train real estate agents</title>
              <meta name="description" content="Soundwise is a audio content management system that helps real estate trainers and brokers disseminate trainings and informational updates in audio to real estate agents." />
              <meta name="keywords" content="soundwise, soundwise inc, real estate, real estate broker, real estate agents, real estate brokerage, real estate training, audio publishing, content management system, audio, mobile application, learning, online learning, online course, podcast, mobile app" />
            </Helmet>
            <Switch>
                <Route exact path="/" component={Page}/>
                <Route path="/about" component={About}/>
                <Route path='/signup' component={AppSignup} />
                <Route path='/signin' component={AppSignin} />
                <Route path='/trial_request' component={TrialRequest} />
                <Route path="/gift" component={Referral} />
                <Route path="/creator_terms" component={CreatorTerms} />
                <Route path="/terms_free_content_May2017" component={TermsFreeContent} />
                <Route exact path="/myprograms" component={MyCourses}/>
                <Route path="/myprograms/:courseId" component={Course_Purchased}/>
                <Route path="/cart" component={Cart} />
                <Route path="/confirmation" component={OrderConfirmation} />
                <Route path="/courses/:courseId" component={Course} />
                <Route path="/staging/:courseId" component={Staged_Course} />
                <Route path="/password_reset" component={PassRecovery} />
                <Route exact path ="/courses" component={CoursesCatalog} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path ="/notfound" component={NotFound} />
                <Route component={NotFound} />
            </Switch>
          </div>
        </ScrollToTop>
      </Router>
    )
  }
}



function mapDispatchToProps(dispatch) {
  return bindActionCreators({ loadCourses, signinUser, subscribeToCategories }, dispatch)
}

export const Routes = connect(null, mapDispatchToProps)(_Routes)