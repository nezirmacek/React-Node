import React, {Component} from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as firebase from "firebase"
import {Card, CardActions, CardHeader, CardMedia, CardTitle, CardText} from 'material-ui/Card'
import ReactStars from 'react-stars'

class _Reviews extends Component {
  constructor(props) {
    super(props)
    this.state = {
      reviews: [{
        reviewer: 'Tash C.',
        date: '10/12/2016',
        pic: '',
        rating: 5,
        content: 'This is a great program. Learned a lot.'
      },
      {
        reviewer: 'Brian Cooper',
        date: '01/11/2017',
        pic: '',
        rating: 4,
        content: 'I like it.'
      },
      ]
    }
  }

  renderRow(review) {

    return (
      <Card>
        <CardHeader
          title={review.reviewer}
          subtitle={review.date}
          avatar={review.pic}
        />
        <CardText>
          <ReactStars
            count={5}
            value = {review.rating}
            size={15}
            edit={false}
            color2={'#ffd700'} />
          <div>
          {review.content}
          </div>
        </CardText>
      </Card>
    )
  }

  render() {
    return (
      <section className="padding-110px-tb xs-padding-60px-tb bg-white builder-bg border-none" id="title-section1">
        <div className="container">
          <div className='row'>
              <div className="col-md-8 center-col col-sm-12 text-center">
                  <h3 className="title-extra-large-1 alt-font xs-title-large  margin-four-bottom tz-text" >How do you like this program?</h3>
              </div>
              <div className="col-md-6 col-sm-11 col-xs-11 center-col text-center" style={{padding: '1.5em', margin: '2em'}}>
                  <button onClick={() => this.handleFBAuth()}  className="text-white btn btn-extra-large2 propClone btn-3d text-white width-100 builder-bg tz-text tz-background-color" style={{backgroundColor: '#61E1FB'}}><span className="tz-text">Write A Review</span></button>
              </div>
          </div>
          <div className='row' style={{marginBottom: '3em'}}>
              <div className="col-md-6 center-col col-sm-12 text-center">
                  <h3 className="title-extra-large-1 alt-font xs-title-large  margin-four-bottom tz-text" >Reviews</h3>
                  <h3 className="title-extra-large-2 alt-font xs-title-large  margin-four-bottom tz-text" >Average Rating: 4.5</h3>
                  <div style={{width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2em'}}>
                    <ReactStars
                      count={5}
                      value = {4.5}
                      size={28}
                      color2={'#ffd700'}
                      edit={false}
                      />
                  </div>
              </div>
          </div>
          <div className='col-md-8 center-col col-sm-12'>
            {this.state.reviews.map(review => this.renderRow(review))}
          </div>
        </div>
      </section>
    )
  }
}

const mapStateToProps = state => {
  const { userInfo, isLoggedIn } = state.user
  return {
    userInfo, isLoggedIn
  }
}

export const Reviews = connect(mapStateToProps, null)(_Reviews)