const express = require('express');
const app = express();
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");

const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 4000;

var my_id = -1;
var login_type;
var my_name;


app.set('view engine', "ejs");
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: 'secret',
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false
  })
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/users/register', checkAuthenticated, (req, res) => {
  res.render('register');
});

app.get('/users/login', checkAuthenticated, (req, res) => {
  res.render('login');
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
  my_id = req.user.login_id;
  login_type = req.user.type;
  my_name = req.user.first_name;
  if (login_type == 'client') {
    res.render('dashboard_client', { user: req.user.first_name, login_id: my_id });
  }
  else if (login_type == 'vendor') {
    res.render('dashboard_vendor', { user: req.user.first_name, login_id: my_id });
  }
  else {
    res.render('dashboard_ep', { user: req.user.first_name, login_id: my_id });
  }
});

app.get("/users/logout", (req, res) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.render("login", { message: "You have logged out successfully" });
  });

});

app.post('/users/register', async (req, res) => {
  let { fname, lname, email, password, password2, street, city, state, country, userType } = req.body;
  console.log({ fname, lname, email, password, password2, street, city, state, country, userType });

  let errors = [];

  if (!fname || !lname || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }
  if (password.length < 6) {
    errors.push({ message: "Password must be at least 6 characters" });
  }
  if (password != password2) {
    errors.push({ message: "Passwords do not match" });
  }
  if (errors.length > 0) {
    res.render('register', { errors });
  }
  else {
    let hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    pool.query(
      `SELECT * FROM login_details
            WHERE email=$1`, [email], (err, results) => {
      if (err) throw err;
      console.log(results.rows);
      if (results.rows.length > 0) {
        errors.push({
          message: "Email already registered"
        });
        return res.render("register", { errors });
      }
      else {
        pool.query(
          `INSERT INTO login_details(email,first_name,last_name,password,street,city,state,country,type)
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                        RETURNING login_id`,
          [email, fname, lname, hashedPassword, street, city, state, country, userType],
          (err, results) => {
            if (err) throw err;
            console.log(results.rows);
            req.flash("success_msg", "You are now registered. Please log in");
            res.redirect("/users/login");
          }
        )
      }
    }
    )


  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
  })
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

// Dashboard to Search
app.get('/users/search', (req, res) => {
  res.render('search.ejs');
});

app.get('/users/dashboard', (req, res) => {
  res.render('dashboard.ejs');
});

//
app.post('/users/query', function (req, res) {
  var s = req.body.speciality;
  var t = req.body.type;
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    //fixing event planner // BUG
    if (t == 1) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE login_details.type='planner' AND sp_speciality='Event Planner'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }

    // if(s==1 && t==1)
    // {
    //   client.query("SELECT * FROM service_provider WHERE sp_type='Event Planner' AND sp_speciality='Catering'",function(err,result){
    //     console.log(result);
    //     res.render('query',{service_provider: result.rows});
    //     done();
    //   });
    // }
    else if (s == 1 && t == 2) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE login_details.type='vendor' AND sp_speciality='Catering'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }
    // else if(s==2 && t==1)
    // {
    //   client.query("SELECT * FROM service_provider WHERE sp_type='Event Planner' AND sp_speciality='Tenting'",function(err,result){
    //     console.log(result);
    //     res.render('query',{service_provider: result.rows});
    //     done();
    //   });
    // }
    else if (s == 2 && t == 2) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE type='vendor' AND sp_speciality='Tenting'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }
    // else if(s==3 && t==1)
    // {
    //   client.query("SELECT * FROM service_provider WHERE sp_type='Event Planner' AND sp_speciality='Transportation'",function(err,result){
    //     console.log(result);
    //     res.render('query',{service_provider: result.rows});
    //     done();
    //   });
    // }
    else if (s == 3 && t == 2) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE type='vendor' AND sp_speciality='Transportation'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }
    // else if(s==4 && t==1)
    // {
    //   client.query("SELECT * FROM service_provider WHERE sp_type='Event Planner' AND sp_speciality='Hall'",function(err,result){
    //     console.log(result);
    //     res.render('query',{service_provider: result.rows});
    //     done();
    //   });
    // }
    else if (s == 4 && t == 2) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE type='vendor' AND sp_speciality='Hall'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }
    // else if(s==5 && t==1)
    // {
    //   client.query("SELECT * FROM service_provider WHERE sp_type='Event Planner' AND sp_speciality='DJ'",function(err,result){
    //     console.log(result);
    //     res.render('query',{service_provider: result.rows});
    //     done();
    //   });
    // }
    else if (s == 5 && t == 2) {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE type='vendor' AND sp_speciality='DJ'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }

    else {
      client.query("SELECT * FROM (profile join service_provider on prof_owner=sp_id) join login_details on service_provider.login_id=login_details.login_id WHERE type='vendor' AND sp_speciality='Event Planner'", function (err, result) {
        console.log(result);
        res.render('query', { service_provider: result.rows });
        done();
      });
    }
  });
});

app.get('/users/event', function (req, res) {
  //PG connect
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('login_id: ', my_id);
    const objectsMap = new Map();
    client.query('SELECT * from event where event_owner=$1', [my_id], async function (err, res1) {
    console.log(res1.rows.length);
    console.log(res1.rows);
    for (var i = 0; i < res1.rows.length; i++) {
      var row = res1.rows[i];
      var obj = {
        event_id: row.event_id,
        event_name: row.event_name,
        event_description: row.event_description,
        event_participants: []
      }
      let res2;
      try {
        res2 = await client.query(' SELECT * from (has natural join service_provider) NATURAL join login_details where event_id=$1', [row.event_id]);
      } catch (err) {
        console.error('Error running query', err);
      }
      console.log(res2.rows.length);
      console.log(res2.rows);
      for (var j = 0; j < res2.rows.length; j++) {
        var row2 = await res2.rows[j];
        var o = {
          first_name: await row2.first_name,
          last_name: await row2.last_name
        }
        obj.event_participants.push(o);
      }
      objectsMap.set(obj.event_id, obj);
    }
    console.log(objectsMap.size);
    res.render('event', { event: objectsMap });
  });
    
  });
});

app.post('/users/event_add', function (req, res) {
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('login_id: ', my_id);
    client.query('INSERT INTO event(event_name, event_description,event_owner) VALUES($1, $2,$3)', [req.body.event_name, req.body.event_description, my_id], function (err, result) {
      done();
      res.redirect('/users/event');
    });
  });
});

app.post('/users/event_edit', function (req, res) {
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    client.query('UPDATE event SET event_name = $1, event_description = $2 WHERE event_id = $3', [req.body.name, req.body.description, req.body.id], function (err, result) {
      done();
      res.redirect('/users/event');
    });
  });
});

// New Integration
app.post('/users/event_participants', function (req, res) {
  console.log('participants');
  console.log(req.body.participants);
  console.log('event id:' + req.body.id);
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }

    client.query('SELECT event_name FROM event WHERE event_id=$1', [req.body.id], function (err, result) {
      console.log(result.rows[0].event_name);
      // function mailSend(email)
      // {
      // var str="You have got an invite request for event ";
      // str+=result.rows[0].event_name;
      //  var transporter = nodemailer.createTransport({
      //    service: 'gmail',
      //    auth: {
      //      user: 'helloak2000@gmail.com',
      //      pass: 'kuebcedlqirykvdf'
      //    }
      //  });

      //  var mailOptions = {
      //    from: 'helloak2000@gmail.com',
      //    to: email,
      //    subject: 'Event Invite',
      //    text: str
      //  };

      //  transporter.sendMail(mailOptions, function(error, info){
      //    if (error) {
      //      console.log(error);
      //    } else {
      //      console.log('Email sent: ' + info.response);
      //    }
      //  });
      //  }
      //  mailSend("highsugarwatermelon46@gmail.com");
    })

    let res1;
    try {
      res1 = await client.query('SELECT login_id from login_details where first_name=$1', [req.body.participants]);
    } catch (err) {
      console.error('Error running query', err);
    }

    let res2;
    try {
      res2 = await client.query('SELECT sp_id from service_provider where login_id=$1', [await res1.rows[0].login_id]);
    } catch (err) {
      console.error('Error running query', err);
    }
    console.log(await res2.rows[0].sp_id, req.body.id, 0);
    client.query('Insert into has values($1,$2,$3)', [await res2.rows[0].sp_id, req.body.id, 0], function (err, result) {
      done();

      res.redirect('/users/event');
    });
  });
});

app.delete('/users/event_delete/:id', function (req, res) {
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('deleting event id: '+req.params.id);
    client.query('DELETE FROM event WHERE event_id = $1', [req.params.id], function (err, result) {
      done();
      console.log("hey");
      res.redirect('/users/event'); // New Integration
     // res.send("DELETE Request Called");
    });
  });
});

app.get('/users/profile', (req, res) => {
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('login_id: ', my_id);
    client.query('SELECT * from (profile join service_provider on prof_owner=sp_id) natural join login_details where login_id=$1', [my_id], function (err, result) {
      if (err) {
        return console.error('Error running query', err);
      }
      if (result.rows.length === 0)
        res.render('build_profile.ejs');
      else
        //Temporary: Needs separate display page
        res.render('profile', { service_provider: result.rows });
      done();
    });
  });
});

app.post('/users/profile_add', function (req, res) {
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('sp_speciality, prof_tagline, prof_description, prof_owner', req.body.sp_speciality, req.body.sp_headline, req.body.sp_description, my_id);
    let res1;
    try {
      res1 = await client.query('SELECT sp_id from service_provider where login_id=$1', [my_id]);
    } catch (err) {
      console.error('Error running query', err);
    }

    client.query('INSERT INTO profile(sp_speciality, prof_tagline, prof_description, prof_owner) VALUES($1, $2, $3, $4)', [req.body.sp_speciality, req.body.sp_headline, req.body.sp_description, await res1.rows[0].sp_id], function (err, result) {
      done();
      res.redirect('/users/dashboard');
    });
  });
});

app.get('/users/chat_box/:id', function (req, res) {
  //PG connect
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('login_id: ', my_id);
    console.log('other_id: ', req.params.id);
    var other_id = req.params.id;
    client.query(' SELECT * from chat where (msg_sender=$1 and msg_reciever=$2) or (msg_sender=$3 and msg_reciever=$4)', [my_id,req.params.id, req.params.id, my_id], function (err, result) {
      if (err) {
        return console.error('Error running query', err);
      }
      client.query('UPDATE chat set seen=1 where msg_reciever=$1 and msg_sender=$2 returning *', [my_id, other_id], function (err, result) {
        if (err) {
          return console.error('Error running query', err);
        }
        console.log(result.rows);
      }
      );
      console.log(result.rows);
      res.render('chat_box', { chat: result.rows, other_id: req.params.id });
      done();
    });
  });
});

app.post('/users/chat_add', function (req, res) {
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('Sender_id: ', my_id);
    console.log('Reciever_id: ', req.body.reciever_id);
    console.log('msg: ', req.body.message);
    client.query('INSERT INTO chat(msg_sender, msg_reciever, msg) VALUES($1, $2, $3)', [my_id, req.body.reciever_id , req.body.message], function (err, result) {
      done();
      res.redirect('/users/chat_box/' + req.body.reciever_id);
    });
  });
});

app.get('/users/my_chat', function (req, res) {
  pool.connect(function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    console.log('login_id: ', my_id);
    const objectsMap = new Map();
    client.query('SELECT distinct msg_sender,msg_reciever from chat where (msg_sender=$1) or (msg_reciever=$2)', [my_id, my_id], async function (err, result) {
      if (err) {
        return console.error('Error running query', err);
      }
      console.log(result.rows);
      console.log(result.rows.length);
      for (var i = 0; i < result.rows.length; i++) {
        var row = result.rows[i];
        console.log(row);
        var sender_name, reciever_name;

        let res1;
        try {
          res1 = await client.query('SELECT first_name from login_details where login_id=$1', [row.msg_sender]);
        } catch (err) {
          console.error('Error running query', err);
        }

        let res2;
        try {
          res2 = await client.query('SELECT first_name from login_details where login_id=$1', [row.msg_reciever]);

        } catch (err) {
          console.error('Error running query', err);
        }

        sender_name = await res1.rows[0].first_name;
        reciever_name = await res2.rows[0].first_name;
        console.log("sender name: " + sender_name);
        console.log("reciever name: " + reciever_name);

        if (sender_name == my_name) {
          var obj = {
            id: row.msg_reciever,
            name: reciever_name
          }
          console.log(obj);
          objectsMap.set(obj.id, obj);
        }
        else {
          var obj = {
            id: row.msg_sender,
            name: sender_name
          }
          console.log(obj);
          objectsMap.set(obj.id, obj);

        }
      }
      console.log(objectsMap);
      res.render('my_chat', { chat: objectsMap });
    });

  });
});

app.get('/users/invite', function (req, res) {
  //PG connect
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    let res1;
    try {
      res1 = await client.query('SELECT sp_id from service_provider where login_id=$1', [my_id]);
    } catch (err) {
      console.error('Error running query', err);
    }
    client.query("SELECT * from event natural join has WHERE sp_id = $1", [await res1.rows[0].sp_id], function (err, result) {
      if (err) {
        return console.error('Error running query', err);
      }
      res.render('invite', { event: result.rows });
      done();
    });
  });
});

app.post('/users/invite_accept', function (req, res) {
  console.log(req.body.id);
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    let res1;
    try {
      res1 = await client.query('SELECT sp_id from service_provider where login_id=$1', [my_id]);
    } catch (err) {
      console.error('Error running query', err);
    }
    client.query("UPDATE has SET invite_status = 1 WHERE event_id = $1 AND sp_id = $2", [req.body.id, await res1.rows[0].sp_id], function (err, result) {
      done();
      res.redirect('/users/invite');
    });
  });
});

app.post('/users/invite_reject', function (req, res) {
  console.log(req.body.id);
  pool.connect(async function (err, client, done) {
    if (err) {
      return console.error('Error fetching client from pool', err);
    }
    let res1;
    try {
      res1 = await client.query('SELECT sp_id from service_provider where login_id=$1', [my_id]);
    } catch (err) {
      console.error('Error running query', err);
    }
    client.query("UPDATE has SET invite_status = -1 WHERE event_id = $1 AND sp_id = $2", [req.body.id, await res1.rows[0].sp_id], function (err, result) {
      done();
      res.redirect('/users/invite');
    });
  });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
