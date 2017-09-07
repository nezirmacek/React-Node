import React, { Component } from 'react';

const renderBio = (bio) => {
  return (
    <div>
      {bio.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  )
}

const Instructor = (props) => (
  <section className="about-style3 padding-40px-tb xs-padding-40px-tb bg-white builder-bg border-none" >
      <div className="container">
          <div className="row padding-40px-tb">
              <div className="col-md-12 col-sm-12 col-xs-12 text-center">
                  <h2 className="section-title-large sm-section-title-medium xs-section-title-large text-dark-gray font-weight-600 alt-font margin-three-bottom xs-margin-fifteen-bottom tz-text" id="tz-slider-text125">YOUR INSTRUCTOR</h2>
              </div>
          </div>
          <div className="row">
            <div className="item">
                <div className="col-md-12 col-sm-12 bg-cream text-left tz-background-color" id="tz-bg-color-7" style={{padding: '8%'}}>
                  <div className='col-md-4 col-sm-6 col-xs-12'>
                      <img alt={`${props.soundcast.hostName}`} src={`${props.soundcast.hostImageURL}`}
                           className="img-round"/>
                  </div>
                   <div className="should-have-a-children scroll-me col-md-8 col-sm-6 col-xs-12" >
                      <span className="title-medium text-dark-gray alt-font display-block tz-text font-weight-500" id="tz-slider-text127">{props.soundcast.hostName}</span>
                      <div className="text-dark-gray text-medium margin-twelve no-margin-lr tz-text" id="tz-slider-text130"><p></p></div>
                      <div className="text-dark-gray text-large tz-text" id="tz-slider-text129" >
                        {props.soundcast.hostBio}
                      </div>
                      <div className="row">

                      </div>
                   </div>
                </div>
            </div>
          </div>
      </div>
  </section>
)


export default Instructor;