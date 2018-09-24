'use strict';
var Mailchimp = require('mailchimp-api-v3')
var firebase = require('firebase-admin');

module.exports.updateMailChimpSubscribers = (req, res) => {
  // Get the subscriberids for the soundcast from firebase
  // Get the subscriber information from firebase
  // Add the subscribers to mailChimp, map the fields.

  updateFirebaseSoundcastWihtListId(req, res)
  .then(() => {
    getSubscribersInfo(req, res);
  })
  .catch(function (err) {
    console.log("Failure updating the list id for soundcasts ", err);
    res.sendStatus(404);
  })  
};


function getSubscribersInfo(req, res) {
  let promises = [];
  for (let userId in req.body.subscribers) {
    promises.push(retrieveSubscriberInfo(userId));
  }

  Promise.all(promises).then(
    result => {
      //Assume we map all the fields and save to mailChimp here.
      //Next we set the list id in the Soundcasts.
      let subscribersMailChimp;
      if (result != null) {
        subscribersMailChimp = result.map(subscriber => {
          if (subscriber != null && subscriber.email && subscriber.email.length > 0) {
            let sub = {};
            sub.email_address = subscriber.email[0];
            sub.status = 'subscribed';
            sub.merge_fields = {
              FNAME: subscriber.firstName,
              LNAME: subscriber.lastName,
             }
             return sub;
          }
          return false; 
        })
        .filter(subscriber => subscriber != false)
      
        //Lets filter this array of duplicate email addresses.
        //This can happen if their duplicate subscribers, which should not happen
        //but happens in the soundcast 'A Soundcast on Inner Mastery'
        subscribersMailChimp =  subscribersMailChimp.filter((subscr, index, self) =>
          index === self.findIndex((t) => (
            t.email_address === subscr.email_address
          ))
        )

        //Now create the object needed by the mailChimp API
        //https://developer.mailchimp.com/documentation/mailchimp/reference/lists/#create-post_lists_list_id
        let mailChimpObjectWithSubscribers = {};
        mailChimpObjectWithSubscribers.members = subscribersMailChimp;
        mailChimpObjectWithSubscribers.update_existing = true;

        var mailchimp = new Mailchimp(req.body.apiKey);

        mailchimp.post(`/lists/${req.body.listId}`,mailChimpObjectWithSubscribers)
        .then(function(results) {
          console.log(`Success adding subscriber to ${req.body.listId} `);
          res.sendStatus(200);
        })
        .catch(function (err) {
          console.log(`Failure adding subscriber to ${req.body.listId} `, err);
        })
      } 
    },
    err => {
      console.log('promise error: ', err);
      res.sendStatus(404);
    }
  );
}

function retrieveSubscriberInfo(userId) {
  return firebase
    .database()
    .ref('users/' + userId)
    .once('value')
    .then(snapshot => {
      return { ...JSON.parse(JSON.stringify(snapshot.val())), id: userId };
    })
    .then(res => res, err => console.log(err));
}

function updateFirebaseSoundcastWihtListId(req, res) {
  return firebase
  .database()
  .ref(`soundcasts/${req.body.soundcastId}`)
  .update({mailChimpId: req.body.listId});
}
