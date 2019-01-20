/*
 * Joins validator Pub servers and subscribe to validators' feeds.
 */

const ssbKeys = require('ssb-keys'),
      fs = require('fs'),
      jsonFormat = require('json-format'),
      ssbClient = require('ssb-client'),
      ssbFeed = require('ssb-feed'),
      pull = require('pull-stream');

const ssbConfigDir = './.ssb';

let configData = JSON.parse(fs.readFileSync('./messagenode-config.json')),  // Array of configurations, once for each messagenode.
    invitations = JSON.parse(fs.readFileSync('./validator-invites.json'));   // Invitations are generated by the validators.

const jsonFormatter = {
        type: 'space',
        size: 4
      };

// For each messagenode, load the "secret" key from respective messagenode folder and then create a client to connect to the 
// respective messagenode node.
configData.forEach((messagenodeConfig, index) => {
    const messagenodeDir = ssbConfigDir + '/m' + (index+1),
          messagenodeKey = 'secret';

    // Create a feed for messagenode with other roles it can take as messages. The other nodes, when connected to this messagenode,
    // will follow this feed to know its roles.

    const keys = ssbKeys.loadOrCreateSync(messagenodeDir + '/' + messagenodeKey)
    console.log(messagenodeDir);
    console.log(keys);
    
    ssbClient(keys, {
        host: 'localhost', // Connect to local pub server
        port: messagenodeConfig[messagenodeKey].port,        // Validator port
        key: keys.id,      // optional, defaults to keys.id
        path: messagenodeDir,      // All config data.   
        caps: {
            // Standard secret-handshake
            shs: '1KHLiKZvAvjbY1ziZEHMXawbCEIM6qwjCDm3VYRan/s='
        }
      },
      function (err, sbot, config) {
            if (err) { console.log(err); return; }
            // Each invitation contains validator's main feed id (user id), which we'll use to get the roles validator plays.
            invitations.forEach((invite) => {
               console.log('Creating user feed stream for ' + invite.validator);
                pull(
                      sbot.createUserStream({ id: invite.validator }),  // The user ID/feed ID.
                      pull.collect((err, feeds) => { 
                          if (err) {
                              console.log('Getting stream failed for ' + invite.validator);
                              console.log(err)
                          } else {
                              console.log('Feed for user ' + invite.validator);
                              
                              feeds.forEach((feed) => {
                                  console.log(feed.value.content);
                                  if (feed.value.content.type === 'validator:role') {
                                      sbot.publish({
                                          type: 'contact',
                                          contact: feed.value.content.role.feedid,
                                          following: true 
                                        }, function(err, msgs) {
                                            if (err) {
                                                console.log('Following failed for user ' + invite.validator);
                                                console.log(err);
                                            } else {
                                                console.log('Messages from: ' + feed.value.content.role.feedid)
                                                console.log(msgs)
                                            }

                                        })  
                                   
                                  }
                            })

                          }

                      })
                    )
            })
        })

})