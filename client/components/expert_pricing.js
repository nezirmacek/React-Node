import React from 'react'
import { Link } from 'react-router-dom'

const ExpertPricing = () => (
  <section className=" builder-bg padding-70px-tb xs-padding-30px-tb cover-background tz-builder-bg-image border-none" style={{background:`linear-gradient(rgba(0,0,0,0.1), rgba(247,107,28,0.3))`}}>
      <div className="container">
          <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12 text-center">
                  <h2 className="section-title-large sm-section-title-medium xs-section-title-large text-dark-gray font-weight-600 alt-font margin-three-bottom xs-margin-fifteen-bottom tz-text">TRY IT FOR FREE FOR 30 DAYS</h2>
                  <div className="text-extra-large width-60 margin-lr-auto md-width-70 sm-width-100 tz-text margin-five-bottom xs-margin-five-bottom">No credit card required. Cancel anytime.</div>
              </div>

          </div>
          <div className="row">
              <div className="col-md-12 col-sm-12 col-xs-12 text-center">
                <div className="pricing-price  builder-bg margin-five-bottom xs-margin-five-bottom">
                    <span className="title-extra-large sm-title-extra-large alt-font  tz-text" style={{color: '#61e1fb'}}>$29</span>
                    <span className="text-large alt-font tz-text no-margin-bottom"> PER MONTH + </span>
                    <span className="title-extra-large sm-title-extra-large alt-font  tz-text" style={{color: '#61e1fb'}}>9% </span>
                    <span className="text-large alt-font tz-text no-margin-bottom">PROCESSING FEE</span>
                </div>
              </div>
          </div>
          <div className="row margin-five-bottom xs-margin-five-bottom">
              <div className="col-md-4 col-sm-4 col-xs-12">
                  <ul className="list-style-none ">
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Payment processing</span></li>
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Unlimited uploading and storage</span></li>

                  </ul>
              </div>
              <div className="col-md-4 col-sm-4 col-xs-12">
                  <ul className="list-style-none ">
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Optional landing pages for your programs</span></li>
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Mobile and web interfaces</span></li>
                  </ul>
              </div>
              <div className="col-md-4 col-sm-4 col-xs-12">
                  <ul className="list-style-none ">
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Listener analytics & tracking</span></li>
                      <li className="position-relative padding-left-30px line-height-34 text-medium"><i className="fa fa-star-o text-dark-gray tz-icon-color position-left position-absolute icon-extra-small line-height-34"></i><span className="tz-text">Push notifications</span></li>
                  </ul>
              </div>
          </div>

          <div className="row">
            <div className="col-md-12 col-sm-12 col-xs-12 text-center">
              <Link to="/trial_request" className="btn-large btn text-dark-blue btn-3d" href="http://eepurl.com/cX2uof" style={{backgroundColor: '#F76B1C'}}><span className="tz-text">TRY IT FOR FREE</span></Link>
            </div>
          </div>

      </div>
  </section>

)

export default ExpertPricing;