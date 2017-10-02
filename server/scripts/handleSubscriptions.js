'use strict';

var admin = require("firebase-admin");

var stripe_key =  require('../../config').stripe_key;

var stripe = require('stripe')(stripe_key);

module.exports.subscriptionRenewal = (req, res) => {
  // console.log('req.body: ', req.data);

  if (req.body.data.object.lines.data[0].period.end) {
    const customer = req.body.data.object.customer;
    const db = admin.database();
    const ref = db.ref('users');
    ref.orderByChild('stripe_id').equalTo(customer)
      .on('value', snapshot => {
        const userId = snapshot.key;
        db.ref(`users/${userId}/soundcasts`).orderByChild('planID').equalTo(req.body.data.object.lines.data[0].plan.id)
          .on('value', snapshot => {
            const soundcast = snapshot.key;
            db.ref(`users/${userId}/soundcasts/${soundcast}/current_period_end`)
              .set(req.body.data.object.lines.data[0].period.end);
          });
      });
    res.status(200).send({});
  }
};

module.exports.unsubscribe = (req, res) => {
  if (req.body.paymentID.slice(0, 3) == 'sub') {
    stripe.subscriptions.del(
      req.body.paymentID,
      function(err, confirmation) {
        if (err) {
          res.status(500).send(err);
        }
        res.send(confirmation);
      }
    );
  } else {
    res.status(200).send({});
  }
};