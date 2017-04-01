import React from 'react';
import Headerform from './headerform';


const Slider = () => (
  <div className="col-md-8 col-sm-11 col-xs-12 center-col text-center">
    { /* slider text */ }
    <h1 className="sm-title-extra-large-4 alt-font xs-title-extra-large-2 title-extra-large-6 text-white font-weight-700 letter-spacing-minus-2 tz-text margin-five-bottom sm-margin-six-bottom margin-lr-auto"
      data-selector=".tz-text" style={ {} }>Be inspired.</h1>
    <div className="text-white text-extra-large xs-text-extra-large width-80 sm-width-90 margin-lr-auto margin-ten-bottom tz-text" data-selector=".tz-text" style={ {} }>
      <p>Soundwise is a mobile learning platform that helps you improve your life and career through short audio lessons from top experts in personal development, science,
        and business.</p>
      <p>Coming soon in 2017.</p>
    </div>
    { /* end slider text */ }
    { /* contact form */ }
    <div className="col-lg-9 col-md-11 col-sm-10 form-subscribe no-padding center-col text-center display-inline-block">
      <Headerform></Headerform>
    </div>
    { /* end contact form */ }
  </div>
);

export default Slider;