'use strict';

// **** listening for firebase data changes for users, soundcasts,
// **** comments, likes, and make changes in postgres accordingly ****

var firebase = require('firebase-admin');
const database = require('../../database/index');

module.exports.transferLikes = () => { // add or delete data from likes node in firebase according to changes to likes in announcements and episodes
  const soundcastsRef = firebase.database().ref('/soundcasts');
  const episodesRef = firebase.database().ref('/episodes');
  const likesRef = firebase.database().ref('/likes');
  var newLikeId;
  soundcastsRef.on('child_changed', soundcast => {
    const soundcastObj = soundcast.val();
    const soundcastId = soundcast.key;
    if(soundcastObj.announcements) {
      for(var key in soundcastObj.announcements) {
        if(soundcastObj.announcements[key].likes) {
          for(var userId in soundcastObj.announcements[key].likes) {
            newLikeId = `${userId}-${key}`;
            firebase.database().ref(`/likes/${newLikeId}`).once('value', snapshot => {
              if(!snapshot.val()) { // if data doesn't already exist
                firebase.database().ref(`/likes/${newLikeId}`).set({
                  announcementId: key,
                  userId,
                  soundcastId,
                  timeStamp: soundcastObj.announcements[key].likes[userId]
                });
              }
            })
          }
        }
      }
    }
  });
  episodesRef.on('child_changed', episode => {
    const episodeObj = episode.val();
    const episodeId = episode.key;
    if(episodeObj.likes) {
      for(var key in episodeObj.likes) {
          newLikeId = `${key}-${episodeId}`;
          firebase.database().ref(`/likes/${newLikeId}`).once('value', snapshot => {
            if(!snapshot.val()) {
              firebase.database().ref(`/likes/${newLikeId}`).set({
                episodeId,
                userId: key,
                soundcastId: episodeObj.soundcastID,
                timeStamp: episodeObj.likes[key]
              });
            }
          })
      }
    }
  });
};

module.exports.firebaseListeners = () => {  // sync firebase with postgres
  const usersRef = firebase.database().ref('/users');
  const commentsRef = firebase.database().ref('/comments');
  const likesRef = firebase.database().ref('/likes');

  usersRef.on('child_added', addOrUpdateUserRecord);
  usersRef.on('child_changed', addOrUpdateUserRecord);
  usersRef.on('child_removed', deleteUserRecord);

  commentsRef.on('child_added', addOrUpdateCommentRecord);
  commentsRef.on('child_changed', addOrUpdateCommentRecord);
  commentsRef.on('child_removed', deleteCommentRecord);

  likesRef.on('child_added', addOrUpdateLikeRecord);
  likesRef.on('child_removed', deleteLikeRecord);
};

function addOrUpdateUserRecord(user) {
  // Get Firebase object
  if (user.val()) {
    const {firstName, lastName, pic_url} = user.val();
    const userId = user.key;
    const userObj = {
      userId,
      firstName,
      lastName,
      picURL: pic_url,
    };

    // Add or update object
    database.User.findOne({
      where: { userId },
    })
    .then(userData => {
      if(userData) { // update
        return userData.update(userObj);
      } else { // create
        return database.User.create(userObj);
      }
    })
    .catch(err => {
      console.log('error saving user data: ', err);
      process.exit(1);
    });
  }
};

function deleteUserRecord(user) {
  const userId = user.key;
  database.User.findOne({
    where: { userId }
  })
  .then(userData => {
    if(userData) {
      return userData.destroy();
    }
  })
  .catch(err => {
      console.log('error deleting user data: ', err);
      process.exit(1);
  });
};

function addOrUpdateCommentRecord(comment) {
  // Get Firebase object
  if (comment.val()) {
    const {episodeID, announcementID, soundcastId, userID, content} = comment.val();
    const commentId = comment.key;
    const commentObj = {
      commentId,
      userId: userID,
      soundcastId,
      episodeId: episodeID,
      announcementId: announcementID,
      content
    };

    // Add or update object
    database.Comment.findOne({
      where: { commentId },
    })
    .then(commentData => {
      if(commentData) { // update
        return commentData.update(commentObj);
      } else { // create
        return database.Comment.create(commentObj);
      }
    })
    .catch(err => {
      console.log('error saving comment data: ', err);
      process.exit(1);
    });
  }
};

function deleteCommentRecord(comment) {
  const commentId = comment.key;
  database.Comment.findOne({
    where: { commentId }
  })
  .then(data => {
    if(data) {
      return data.destroy();
    }
  })
  .catch(err => {
      console.log('error deleting comment data: ', err);
      process.exit(1);
  });
};

function addOrUpdateLikeRecord(like) {
  // Get Firebase object
  if (like.val()) {
    const {episodeId, announcementId, commentId, soundcastId, userId} = like.val();
    const likeId = like.key;
    const likeObj = {
      likeId,
      userId,
      soundcastId,
      episodeId,
      announcementId,
      commentId,
    };

    // Add or update object
    database.Like.findOne({
      where: { likeId },
    })
    .then(likeData => {
      if(likeData) { // update
        return likeData.update(likeObj);
      } else { // create
        return database.Like.create(likeObj);
      }
    })
    .catch(err => {
      console.log('error saving like data: ', err);
      process.exit(1);
    });
  }
};

function deleteLikeRecord(like) {
  const likeId = like.key;
  database.Like.findOne({
    where: { likeId }
  })
  .then(data => {
    if(data) {
      return data.destroy();
    }
  })
  .catch(err => {
      console.log('error deleting like data: ', err);
      process.exit(1);
  });
};