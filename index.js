var express    = require('express');
var bodyParser = require('body-parser');
var request    = require('request');
var app        = express();
var router     = express.Router();
var port       = process.env.PORT || 8080;
var settings   = require('./settings.js');
var j          = require('./jservice.js');
var parameterize = require('parameterize');

// use body parser since we're json only
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// define routes
router.post('/', function(req, res) {
  var q = req.body;
  var params = q.trigger_word ? q.text.split(" ").slice(1) : q.text.split(" ");
  var random = (params[0] == 'random');
  var command = typeof (params[1] + params[2]) == 'string' && (params[1] + params[2]).replace(/\s/g, "").toLowerCase();
  var isAnswer = isNumber(params[0]) && (command == 'whatis' || command == 'whatare' || command == 'whois' || command == 'whoare');
  var answer = params.slice(3).join(" ");
  var clueId;

  console.log(params);
  console.log(q);

  if (isAnswer) {
    clueId = parseInt(params[0]);
    console.log("getting clueID: " + clueId);
    j.get("/clues/" + clueId + ".json", function(err, resp, body) {
      var clue, payload;

      console.log(body);

      if (!err) {
        clue = JSON.parse(body);
        payload = {
          channel: q.channel_id,
          text: "@" + q.user_name + ":"
        };

        if (parameterize(answer) == parameterize(clue.answer)) {
          payload.text += " Correct! You get $" + clue.value + ".";
        } else {
          payload.text += " Nope. Correct answer is: " + clue.answer.replace(/\\/g, "");
        }

        request.post({
          url: settings.webhook,
          form: {
            payload: JSON.stringify(payload)
          },
        },
        function(e, sres, sbody) {
          if (e) console.log(e);
          else if (sbody) console.log(sbody);
          res.end();
        });
      }
    });
  }

  if (random) {
    j.get('/api/random', function(err, resp, body) {
      var clue, payload, text;
      if (err) {
        res.json({ error: err });
      } else {
        try {
          clue = JSON.parse(body)[0];
          console.log(clue);
          text = "Alright, @" + q.user_name + ", here's your clue:";
          payload = {
            channel: q.channel_id,
            text: text,
            attachments: [
              {
                fallback: text,
                fields: [
                  {
                    title: "Category",
                    value: clue.category.title,
                    short: true
                  },
                  {
                    title: "Amount",
                    value: "$" + clue.value,
                    short: true
                  },
                  {
                    title: "Clue",
                    value: clue.question.replace(/\\/g, "")
                  },
                  {
                    title: "To answer, type:",
                    value: "trebek " + clue.id + " what is ..."
                  }
                ]
              }
            ]
          };

          request.post({
            url: settings.webhook,
            form: {
              payload: JSON.stringify(payload)
            },
          },
          function(e, sres, sbody) {
            if (e) console.log(e);
            else if (sbody) console.log(sbody);

            res.end();
          });

        } catch(e) {
          console.log(e);
          res.json({ error: e });
        }
      }
    });
  }

});

// register routes
app.use('/api', router);

// start the server
app.listen(port);

console.log("Jeopardy server started on port " + port);


// helper methods
function isNumber(obj) { return !isNaN(parseFloat(obj)) }
