var port = process.env.PORT;

var express = require('express');
var bodyParser = require('body-parser');
var supertest = require('supertest-as-promised');
var SHA1 = require('crypto-js/sha1');
var mockery = require('mockery');
var fs = require('fs');
var gm = require('gm');

var createTransportSpy = sinon.spy(function () {
        return {
            sendMail: sendMailSpy
        }
    });

var sendMailSpy = sinon.spy();

var nodemailerMock = {
    createTransport: createTransportSpy
};

var mailchimpAPIMock = {
    lists: {
        subscribe: sinon.spy()
    }
};

var mailchimpFactoryMock = sinon.spy(function(apiKey) {
    return mailchimpAPIMock;
});

var tmpfilepath;

var multiparty = require('multiparty');

var oldOn = multiparty.Form.prototype.on;

multiparty.Form.prototype.on = function(action, callback) {
    if(action == 'file') {
        oldOn.call(this, action, callback2);
    } else {
        oldOn.call(this, action, callback);
    }

    function callback2(name, file) {
        tmpfilepath = file.path;
        callback(name, file);
    }
};

mockery.registerMock('mailchimp-api', {
    Mailchimp: mailchimpFactoryMock
});

mockery.registerMock('nodemailer', nodemailerMock);

mockery.registerMock('multiparty', multiparty);

mockery.enable({ useCleanCache: true, warnOnUnregistered: false });

// var request = supertest('http://localhost:' + port);

process.env.NODE_ENV = 'test';

var app = require('../../server');

mockery.disable();

var request = supertest(app);

describe('API /api/user public part', function() {
    var db = app.db;
    var collection = db.get('usercollection');

    beforeEach(function(done) {
        collection.drop(function () {
            done();
        });
    });

    describe('POST /api/user', function(done) {
        var email = 'example@example.com';
        var nickname = 'auser';
        var password = 'apass';
        var hashedPassword = SHA1(password).toString();

        it('should create user with email, nickname and password', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: nickname, password: hashedPassword })
                .expect(201)
                .end(function(err, res) {
                    if (err) throw err;
                    collection.find({username: email}, function(err, result) {
                        expect(result[0].username).to.equal(email);
                        expect(result[0].nickname).to.equal(nickname);
                        expect(result[0].password).to.equal(hashedPassword);
                        done();
                    });
                });
        });

        it('should set new user daysvisited to 0', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: nickname, password: hashedPassword })
                .expect(201)
                .end(function(err, res){
                    if (err) throw err;
                    collection.find({username: email}, function(err, result) {
                        expect(result[0].daysvisited).to.equal(0);
                        done();
                    });
                });
        });

        it('should create user with the same email but a few leters', function(done) {
            collection.insert({username: 'example@examPLe.com'}, function(){
                request.post('/api/user')
                    .send({ email: 'example@example.co', nickname: nickname, password: hashedPassword })
                    .expect(201)
                    .end(function(err, res){
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('should return 403 error when creating user with the same email', function(done) {
            collection.insert({username: email}, function(){
                request.post('/api/user')
                    .send({ email: email, nickname: nickname, password: hashedPassword })
                    .expect(403)
                    .end(function(err, res){
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('should return 403 error when creating user with the same email with different case', function(done) {
            collection.insert({username: 'example@examPLe.com'}, function(){
                request.post('/api/user')
                    .send({ email: 'eXaMpLe@ExAmple.cOm', nickname: nickname, password: hashedPassword })
                    .expect(403)
                    .end(function(err, res){
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('should return 403 error when creating user with the same nickname', function(done) {
            collection.insert({nickname: nickname}, function(){
                request.post('/api/user')
                    .send({ email: email, nickname: nickname, password: hashedPassword })
                    .expect(403)
                    .end(function(err, res){
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('should return 403 error when creating user with the same nickname with different case', function(done) {
            collection.insert({nickname: 'examPLe'}, function(){
                request.post('/api/user')
                    .send({ email: email, nickname: 'EXamplE', password: hashedPassword })
                    .expect(403)
                    .end(function(err, res){
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('should return 400 error when nickname is longer than 15 characters', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: '1234567890123456', password: hashedPassword })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('should return 400 error when nickname contains an @ character', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: '1238@9012', password: hashedPassword })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('should return 400 error when email is longer than 60 characters', function(done) {
            request.post('/api/user')
                .send({ email: '1234567890123456789012345678901234567890123456789012345678901',
                        nickname: nickname,
                        password: hashedPassword })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('should return 400 error when password is longer than 40 chars', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: nickname, password: '12345678901234567890123456789012345678901' })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('should return 400 error when password is shorter than 40 chars', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: nickname, password: '123456789012345678901234567890123456789' })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('should return 400 error when password is not a 40-char hex', function(done) {
            request.post('/api/user')
                .send({ email: email, nickname: nickname, password: '12345678901234567890123456789012_4567890' })
                .expect(400)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        describe('sends confirmation email', function(done) {
            beforeEach(function(done) {
                createTransportSpy.reset();
                sendMailSpy.reset();

                collection.drop(function () {
                    done();
                });
            });

            it('transporter registered with correct options', function(done) {
                checkEmailTransporter(
                    request.post('/api/user')
                        .send({ email: email, nickname: nickname, password: hashedPassword }),
                    done);
            });

            it('sends email when user correctly registered with correct options', function(done) {
                checkEmailContent(
                    request.post('/api/user')
                        .send({ email: email, nickname: nickname, password: hashedPassword }),
                    email,
                    nickname,
                    done);
            });

            it('doesn\'t send email when user can\'t be registered', function(done) {
                request.post('/api/user')
                    .send({ email: email, nickname: nickname, password: hashedPassword })
                    .end(function(err, res) {
                        createTransportSpy.reset();
                        sendMailSpy.reset();

                        request.post('/api/user')
                            .send({ email: email, nickname: nickname, password: hashedPassword })
                            .end(function(err, res) {
                                expect(createTransportSpy.called).to.be.false;
                                expect(sendMailSpy.called).to.be.false;
                                done();
                            });
                    });
            });
        });

        describe('mailchimp user registration', function() {
            beforeEach(function() {
                mailchimpAPIMock.lists.subscribe.reset();
            });

            it('using the right api key', function() {
                testMailchimpFactory();
            });

            it('registers user in mailchimp if success (200)', function(done) {
                testMailchimp(
                    request.post('/api/user')
                        .send({ email: email, nickname: nickname, password: hashedPassword }),
                    email,
                    done);
            });

            it('does not register user in mailchimp if error (40x)', function(done) {
                request.post('/api/user')
                    .send({ email: email, nickname: 'nicknametoolongforanickname', password: hashedPassword })
                    .end(function(err, res) {
                        expect(mailchimpAPIMock.lists.subscribe.called).to.be.false;
                        done();
                    });
            });

        });
    });

    describe('PUT /api/user (Facebook registration and login)', function() {
        var db = app.db;
        var collection = db.get('usercollection');
        var fbobj;
        var email;
        var nickname;

        beforeEach(function(done) {
            email = 'an@email.com';
            nickname = 'Aname Amiddlename Asurname';

            fbobj = {
                profile: {
                    id : "10983709650981609",
        			displayName : nickname,
        			name : {
        				familyName : "Asurname",
        				givenName : "Aname",
        				middleName : "Amiddlename"
        			},
        			gender : "male",
        			profileUrl : "https://www.facebook.com/app_scoped_user_id/10983709650981609/",
        			emails : [
        				{
        				    value : email
        				}
        			],
        			provider : "facebook"
                },
                token: '09d09de098g0eo98fud9i098'
        	};

            createTransportSpy.reset();
            sendMailSpy.reset();

            mailchimpAPIMock.lists.subscribe.reset();

            collection.drop(function () {
                done();
            });
        });

        it('registers a new facebook user', function(done) {
            request.put('/api/user/' + fbobj.profile.id)
                .send(fbobj)
                .end(function(err, res){
                    if (err) throw err;
                    collection.find({username: email}, function(err, result) {
                        expect(result).to.not.be.empty;
                        expect(result[0].nickname).to.equal('Aname');
                        expect(result[0].facebook).to.deep.equal(fbobj);
                        expect(result[0].daysvisited).to.equal(0);
                        expect(result[0].avatar.small).to.equal("https://graph.facebook.com/" + fbobj.profile.id + "/picture" + "?width=60&height=60");
                        expect(result[0].avatar.large).to.equal("https://graph.facebook.com/" + fbobj.profile.id + "/picture" + "?width=500&height=500");
                        done();
                    });
                });
        });

        describe('nickname length cut', function() {
            it('cuts to the last space before position 13', function(done) {
                fbobj.profile.displayName = '1234 67890 234';
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj)
                    .end(function(err, res){
                        if (err) throw err;
                        collection.find({username: email}, function(err, result) {
                            expect(result).to.not.be.empty;
                            expect(result[0].nickname).to.equal('1234 67890');
                            done();
                        });
                    });
            });

            it('cuts to 13 chars if no space', function(done) {
                fbobj.profile.displayName = 'nicknametoolongforanickname';

                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj)
                    .end(function(err, res){
                        if (err) throw err;
                        collection.find({username: email}, function(err, result) {
                            expect(result[0].nickname).to.equal(fbobj.profile.displayName.substr(0,13));

                            done();
                        });
                    });
            });

            it('cuts and adds index when nickname exists in the database', function(done) {
                collection.insert({nickname: 'Aname', username: 'another@email.com'}, function (err, result) {
                    if (err) throw err;
                    request.put('/api/user/' + fbobj.profile.id)
                        .send(fbobj)
                        .end(function(err, res){
                            if (err) throw err;
                            collection.find({'facebook.profile.id': fbobj.profile.id}, function(err, result) {
                                if (err) throw err;
                                expect(result[0].nickname).to.equal('Aname2');

                                done();
                            });
                        });
                });
            });
        });

        it('tries a different nickname when registering a facebook user with an existing nickname', function(done) {
            collection.insert({nickname: 'Aname', username: 'some@email.com'}, function (err, result) {
                collection.insert({nickname: 'Aname2', username: 'someother@email.com'}, function (err, result) {
                    if (err) throw err;

                    var fbobj2 = {
                        profile: {
                            id : "65743289436928759",
                			displayName : fbobj.profile.displayName,
                			name : fbobj.profile.name,
                			gender : "male",
                			profileUrl : "https://www.facebook.com/app_scoped_user_id/65743289436928759/",
                			emails : [
                				{
                				    value : 'adifferent@email.com'
                				}
                			],
                			provider : "facebook"
                        },
                        token: '9786149876db9786db987pyb976b'
                	};

                    request.put('/api/user/' + fbobj2.profile.id)
                        .send(fbobj2)
                        .end(function(err, res){
                            if (err) throw err;
                            collection.find({'facebook.profile.id': fbobj2.profile.id}, function(err, result) {
                                expect(result).to.not.be.empty;
                                expect(result[0].nickname).to.not.equal(fbobj.profile.displayName);
                                expect(result[0].facebook).to.deep.equal(fbobj2);
                                done();
                            });
                        });
                });
            });
        });

        it('merges facebook user when logging in with a facebook profile whose email matches an existing email in the db', function(done) {
            collection.insert({nickname: fbobj.profile.displayName, username: email}, function (err, result) {
                var userid = result._id;

                if (err) throw err;
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj)
                    .end(function(err, res){
                        if (err) throw err;
                        collection.find({'facebook.profile.id': fbobj.profile.id}, function(err, result) {
                            if (err) throw err;
                            expect(result[0]).to.not.be.empty;
                            expect(result[0]._id).to.deep.equal(userid);

                            done();
                        });
                    });
            });

        });

        it('transporter registered with correct options', function(done) {
            checkEmailTransporter(
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj),
                done);
        });

        it('sends email when user correctly registered with correct options', function(done) {
            checkEmailContent(
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj),
                email,
                'Aname',
                done);
        });

        it('does not send email when merging into existing user', function(done) {
            collection.insert({nickname: fbobj.profile.displayName, username: email}, function (err, result) {
                var userid = result._id;

                if (err) throw err;
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj)
                    .end(function(err, res){
                        if (err) throw err;

                        expect(createTransportSpy.called).to.be.false;
                        expect(sendMailSpy.called).to.be.false;
                        done();
                    });
            });
        });

        it('using the right api key', function() {
            testMailchimpFactory();
        });

        it('registers user in mailchimp if success (200)', function(done) {
            testMailchimp(
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj),
                email,
                done);
        });

        it('does not sign user up in mailchimp when merging into existing user', function(done) {
            collection.insert({nickname: fbobj.profile.displayName, username: email}, function (err, result) {
                var userid = result._id;

                if (err) throw err;
                request.put('/api/user/' + fbobj.profile.id)
                    .send(fbobj)
                    .end(function(err, res){
                        if (err) throw err;

                        expect(mailchimpAPIMock.lists.subscribe.called).to.be.false;
                        done();
                    });
            });
        });

        afterEach(function(done) {
            collection.drop(function () {
                done();
            });
        });
    });

    function checkEmailTransporter(promise, done) {
        var expectedTransporterOptions = {
            service: 'Gmail',
            auth: {
                user: 'babelboodotcom@gmail.com',
                pass: 'kyqgfawqokbemjdz'
            }
        };

        promise.end(function(err, res) {
                expect(createTransportSpy.called).to.be.true;
                expect(createTransportSpy.calledWithExactly(expectedTransporterOptions)).to.be.true;
                done();
            });
    }

    function checkEmailContent (promise, email, nickname, done) {
        var text =
            '*********************\n'
            +'Bienvenido a babelboo\n'
            +'*********************\n'
            +'\n'
            +'------------------------\n'
            +'Have fun, learn English!\n'
            +'------------------------\n'
            +'\n'
            +'Tu usuario #username# se ha creado correctamente.\n'
            +'Puedes hacer click en el botón de más abajo para entrar a\n'
            +'babelboo y empezar a ver vídeos.\n'
            +'Cuando entres verás diferentes playlists y puedes escoger\n'
            +'tema y dificultad. La idea es que puedas pasarte horas mirando\n'
            +'viídeos de cosas que te interesan y de tu nivel.\n'
            +'\n'
            +'Entra a babelboo ( http://www.babelboo.com )\n'
            +'\n'
            +'¿Andas muy liado? Aquí ( http://www.babelboo.com/play/54aab86ba5606f354096a9eb ) tienes\n'
            +'una playlist cortita que no te llevará más de cinco minutos.\n'
            +'\n'
            +'www.babelboo.com ( http://www.babelboo.com )\n'
            +'\n'
            +'babelboo.com ( http://www.babelboo.com )\n'
            +'\n'
            +'Copyright © 2015 Babelboo, All rights reserved.\n';

        var html = '<html>' +
            '<body style="background-color: #F2F2F2; height: 100% !important; width: 100% !important;">' +
            '<div style="padding: 10px">' +
                '<div style="width: 600px; background-color: #fff; color: #606060 !important; font-family: Helvetica !important; margin: 10px auto; padding: 20px;" bgcolor="#fff">' +
                    '<img src="http://www.babelboo.com/img/welcomeboo.png"/>' +
                    '<h1 style="font-size: 40px; line-height: 125%; letter-spacing: -1px; margin: 0;">Bienvenido a babelboo</h1>' +
                    '<h2 style="font-size: 18px; line-height: 125%; letter-spacing: -.5px; margin: 0;">Have fun, learn English!</h2>' +
                    '<p style="font-size: 15px; line-height: 150%;">Tu usuario #username# se ha creado correctamente. ' +
                    'Puedes hacer click en el botón de más abajo para entrar a babelboo y empezar a ver vídeos. ' +
                    'Cuando entres verás diferentes playlists y puedes escoger tema y dificultad. La idea es que puedas pasarte horas mirando vídeos de cosas que te interesan y de tu nivel.' +
                    '</p>' +
                    '<div style="text-align: center; padding: 30px;" align="center">' +
                        '<a href="http://www.babelboo.com" style="color: #fff !important; text-decoration: none; border-radius: 5px; font-family: Helvetica; font-weight: bold; background-color: #228b22; padding: 15px; border: 2px solid #176617;">Entra a babelboo</a>' +
                    '</div>' +
                    '<p style="font-size: 15px; line-height: 150%;">¿Andas muy liado? <a href="http://www.babelboo.com/play/54aab86ba5606f354096a9eb" style="color: #6DC6DD;">Aquí</a> tienes una playlist cortita que no te llevará más de cinco minutos.</p>' +
                    '<p style="font-size: 15px; line-height: 150%;"><a href="http://www.babelboo.com" style="color: #6DC6DD;">www.babelboo.com</a></p>' +
                    '<em style="font-size: 12px;">' +
                        '<a href="http://www.babelboo.com" style="color: #606060 !important;">babelboo.com</a>' +
                        '<br/>' +
                        'Copyright © 2015 Babelboo, All rights reserved.' +
                    '</em>' +
                '</div>' +
            '</div>' +
            '</body>' +
            '</html>';

        text = text.replace('#username#', nickname);
        html = html.replace('#username#', nickname);

        var expectedMailOptions = {
            from: 'Babelboo <contact@babelboo.com>',
            to: email,
            subject: 'Bienvenido a babelboo',
            text: text,
            html: html
        };

        promise.end(function(err, res) {
                expect(sendMailSpy.calledWith(expectedMailOptions)).to.be.true;
                done();
            });

    }

    function testMailchimpFactory() {
        var apiKey = 'd644f26190a45f861fd87642679135ec-us9';
        expect(mailchimpFactoryMock.calledWithExactly(apiKey)).to.be.true;
    }

    function testMailchimp (promise, email, done) {
        var mailchimpOpts = {
            id: 'ae8469cddc',
            email: {
                email: email
            },
            merge_vars: {
                groupings: [
                    {
                        name: "Language",
                        groups: ["Spanish"]
                    },
                    {
                        name: "Reminders",
                        groups: ["Inactivity reminder"]
                    },
                    {
                        name: "Babelboo updates",
                        groups: ["New release"]
                    },
                    {
                        name: "Registration type",
                        groups: ["users"]
                    }
                ],
                mc_language: 'es_ES'
            },
            double_optin: false,
            update_existing: true
        };

        promise.end(function(err, res) {
                expect(mailchimpAPIMock.lists.subscribe.calledWith(mailchimpOpts)).to.be.true;
                done();
            });
    }

    describe('API /api/user/recover', function() {
        var db = app.db;
        var collection = db.get('usercollection');
        var email = 'example@example.com';
        var nickname = 'auser';

        beforeEach(function(done) {
            createTransportSpy.reset();
            sendMailSpy.reset();

            var query = {
                username: email,
                nickname: nickname,
                password: 'sceaosrcbaorlub',
                daysvisited: 0
            };

            collection.insert(query, done);
        });

        it('gives a success code when reseting a password for an existing email', function(done) {
            request.post('/api/user/recover')
                .send({ email: email })
                .expect(200)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('gives a success code when reseting a password for a nonexisting email', function(done) {
            request.post('/api/user/recover')
                .send({ email: email })
                .expect(200)
                .end(function(err, res){
                    if (err) throw err;
                    done();
                });
        });

        it('generates a token for the user in the database', function(done) {
            request.post('/api/user/recover')
                .send({ email: email })
                .end(function(err, res) {
                    collection.find({ username: email }, function (err, result) {
                        var firstToken = result[0].resetpasswordtoken;
                        expect(firstToken).to.exist;
                        expect(firstToken).to.have.length(40);

                        request.post('/api/user/recover')
                        .send({ email: email })
                        .end(function(err, res) {
                            collection.find({ username: email }, function (err, result) {
                                expect(result[0].resetpasswordtoken).to.exist;
                                expect(result[0].resetpasswordtoken).to.not.equal(firstToken);
                                done();
                            });
                        });
                    });
                });
        });

        it('sends an email when reseting pasword if the user exists', function(done) {
            var text = 'Hi #username#,\n' +
                    '\n' +
                    'Click on the link below to reset your password.\n' +
                    '\n' +
                    'http://www.babelboo.com/resetpassword?token=#token#\n';
            var html = '<html><body><p>Hi #username#.</p>' +
                        '<p>Click on the link below to reset your password.</p>' +
                        '<p><a href="http://www.babelboo.com/resetpassword?token=#token#">http://www.babelboo.com/resetpassword?token=#token#</a></p>' +
                        '</body></html>';
            text = text.replace('#username#', nickname);
            html = html.replace('#username#', nickname);

            request.post('/api/user/recover')
                .send({ email: email })
                .end(function(err, res) {
                    collection.find({ username: email }, function (err, result) {
                        var token = result[0].resetpasswordtoken;
                        text = text.replace('#token#', token);
                        html = html.replace('#token#', token);
                        html = html.replace('#token#', token);

                        var expectedMailOptions = {
                            from: 'Babelboo <contact@babelboo.com>',
                            to: email,
                            subject: 'Reset your babelboo password',
                            text: text,
                            html: html
                        };

                        expect(createTransportSpy.called).to.be.true;
                        expect(sendMailSpy.calledWith(expectedMailOptions)).to.be.true;
                        done();
                    });
                });
        });

        it('doesn\'t send an email if the user doesn\'t exist', function(done) {
            request.post('/api/user/recover')
                .send({ email: 'thisemaildoes@not.exist' })
                .end(function(err, res) {
                    expect(createTransportSpy.called).to.be.false;
                    expect(sendMailSpy.called).to.be.false;
                    done();
                });
        });

        it('sets the correct expiration date for the token in the database', function(done) {
            var TOKEN_VALIDITY = 1; // days
            var startTime = nDaysAgo(-TOKEN_VALIDITY);

            request.post('/api/user/recover')
                .send({ email: email })
                .end(function(err, res) {
                    collection.find({ username: email }, function (err, result) {
                        var endTime = nDaysAgo(-TOKEN_VALIDITY);
                        expect(result[0].resetpasswordexpires).to.be.within(startTime, endTime);
                        done();
                    });
                });
        });
    });

    describe('API /api/user/reset', function() {
        var USERNAME = 'auser';
        var PASSWORD = 'apassword'
        var TOKEN = 'ie8ai8ua87iaui78au';

        before(function() {
            process.env.NODE_ENV = 'development';
        });

        beforeEach(function(done) {
            collection.insert({
                username: USERNAME,
                password: PASSWORD,
                resetpasswordtoken: TOKEN,
                resetpasswordexpires: nDaysAgo(-1)
            }, done);
        });

        it('resets password when token is valid', function(done) {
            var password = '7iaie79ia9iai9e9iei';

            request
                .post('/api/user/reset')
                .send({ token: TOKEN, password: password})
                .end(function(err, res) {
                    collection.find({username: USERNAME}, function(err, res) {
                        expect(res[0].password).to.equal(password);
                        done();
                    })
                });
        });

        it('returns success code when password and token are valid', function() {
            var password = '7iaie79ia9iai9e9iei';

            return request
                .post('/api/user/reset')
                .send({ token: TOKEN, password: password})
                .expect(200);
        });

        it('fails when token not specified', function() {
            var password = '7iaie79ia9iai9e9iei';

            return request
                .post('/api/user/reset')
                .send({ password: password})
                .expect(400);
        });

        it('fails when password not specified', function(done) {
            request
                .post('/api/user/reset')
                .send({ token: TOKEN })
                .expect(400)
                .end(function(err, res) {
                    if(err) throw err;
                    collection.find({username: USERNAME}, function(err, res) {
                        expect(res[0].password).to.equal(PASSWORD);
                        done();
                    })
                });
        });

        it('fails when password is empty', function(done) {
            request
                .post('/api/user/reset')
                .send({ token: TOKEN, password: ''})
                .expect(400)
                .end(function(err, res) {
                    if(err) throw err;
                    collection.find({username: USERNAME}, function(err, res) {
                        expect(res[0].password).to.equal(PASSWORD);
                        done();
                    })
                });
        });

        it('fails when token is not in the db', function() {
            var password = '7iaie79ia9iai9e9iei';

            return request
                .post('/api/user/reset')
                .send({ token: 'ha0l9dl9ed908efu78le8l7', password: password})
                .expect(401);
        });

        it('fails when using token twice', function(done) {
            var password = '7iaie79ia9iai9e9iei';

            request
                .post('/api/user/reset')
                .send({ token: TOKEN, password: password})
                .end(function(err, res) {
                    request
                        .post('/api/user/reset')
                        .send({ token: TOKEN, password: 'd1274fy1'})
                        .expect(401)
                        .end(function(err, res) {
                            if(err) throw err;
                            collection.find({username: USERNAME}, function(err, res) {
                                expect(res[0].password).to.equal(password);
                                done();
                            });
                        });
                });
        });

        it('fails when token has expired', function(done) {
            collection.update({ username: USERNAME }, {$set: {resetpasswordexpires: nDaysAgo(1)}}, function () {
                request
                    .post('/api/user/reset')
                    .send({ token: TOKEN, password: 'newpassword'})
                    .expect(401)
                    .end(function(err, res) {
                        if(err) throw err;
                        collection.find({username: USERNAME}, function(err, res) {
                            expect(res[0].password).to.equal(PASSWORD);
                            done();
                        })
                    });
            });
        });

        it('logs user in automatically after changing password', function(done) {
            var password = '7iaie79ia9iai9e9iei';

            request
                .post('/api/user/reset')
                .send({ token: TOKEN, password: password})
                .end(function(err, res) {
                    var setCookie = res.headers['set-cookie'];
                    request
                        .get('/loggedin')
                        .set('Cookie', setCookie)
                        .end(function(err, res) {
                            expect(JSON.parse(res.text).username).to.equal(USERNAME);
                            done();
                        });
                });
        });


        after(function() {
            process.env.NODE_ENV = 'test';
        });
    });

    afterEach(function(done) {
        collection.drop(function () {
            done();
        });
    });
});

describe('API /api/user private part', function() {
    var setCookie;

    var db = app.db;
    var userdb = db.get('usercollection');
    var logindb = db.get('testlogin');

    var USERNAME = 'auser@test.com';
    var NICKNAME = 'auser';
    var HASHED_PASSWORD = 'a7oeiua7iaa9euaeo7i';

    beforeEach(function(done) {
        userdb.drop(function() {
            userdb.insert({username: USERNAME, nickname: NICKNAME, password: HASHED_PASSWORD}, done);
        });
    });

    beforeEach(function(done) {
        logindb.drop(function() {
            logindb.insert({username: USERNAME, nickname: NICKNAME, password: HASHED_PASSWORD},
                function () {
                    app.onSessionConnected(function() {
                        request.post('/login')
                            .send({ username: USERNAME, password: HASHED_PASSWORD })
                            .end(function(err, res){
                                setCookie = res.headers['set-cookie'];
                                if (err) throw err;
                                done();
                            });
                    }
                );
            });
        });
    });


    describe('retrieve user data', function () {
        var user;
        var set;

        beforeEach(function (done) {
            var logindb = db.get('testlogin');

            set = {
                daysvisited: 13,
                lastvisit: new Date(),
                medalhistory: [1,2,3],
                nickname: NICKNAME,
                playlistprogress: {a: 1, b: 2, c: 3},
                avatar: {small: 'a_url', large: 'a_url'},
                abtesting: 'abtestingobject'

            }

            logindb.update({username: USERNAME}, {$set: set}, function () {
                return request
                    .get('/api/user')
                    .set('Cookie', setCookie)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) throw err;
                        user = JSON.parse(res.text);
                        done();
                    });
            });
        });

        it('returns username field', function() {
            expect(user.username).to.exist;
        });

        it('returns nickname field', function() {
            expect(user.nickname).to.exist;
        });

        it('returns avatar field', function() {
            expect(user.avatar).to.exist;
        });

        it('returns abtesting field', function() {
            expect(user.abtesting).to.deep.equal(set.abtesting);
        });

        it('does not return password field', function() {
            expect(user.password).to.not.exist;
        });

        it('does not return daysvisited field', function() {
            expect(user.daysvisited).to.not.exist;
        });

        it('does not return lastvisit field', function() {
            expect(user.lastvisit).to.not.exist;
        });

        it('does not return medalhistory field', function() {
            expect(user.medalhistory).to.not.exist;
        });

        it('returns playlistprogress field', function() {
            expect(user.playlistprogress).to.exist;
        });

        it('returns haspassword = true when user has password', function() {
            expect(user.haspassword).to.be.true;
        });

        it('returns haspassword = false when user has no password', function(done) {
            var logindb = db.get('testlogin');

            logindb.update({username: USERNAME}, {$unset: {password: true}}, function () {
                return request
                    .get('/api/user')
                    .set('Cookie', setCookie)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) throw err;
                        user = JSON.parse(res.text);
                        expect(user.haspassword).to.be.false;
                        done();
                    });
            });
        });

        it('username conflicts with existing user in the database', function (done) {
            var newUsername = 'existingusername@test.com';

            userdb.insert({ username: newUsername }, function() {
                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: NICKNAME, username: newUsername, password: HASHED_PASSWORD, newpassword: undefined})
                    .expect(403)
                    .end(function (err) {
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('nickname conflicts with existing user in the database', function(done) {
            var newNickname = 'existingnickname';

            userdb.insert({ nickname: newNickname }, function() {
                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: USERNAME, password: HASHED_PASSWORD, newpassword: undefined})
                    .expect(403)
                    .end(function (err) {
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('username and nickname changed and username conflicts with existing user in the database', function(done) {
            var newUsername = 'existingusername@test.com';

            userdb.insert({ username: newUsername }, function() {
                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: 'anothernewnickname', username: newUsername, password: HASHED_PASSWORD, newpassword: undefined})
                    .expect(403)
                    .end(function (err) {
                        if (err) throw err;
                        done();
                    });
            });
        });

        it('username and nickname changed and nickname conflicts with existing user in the database', function(done) {
            var newNickname = 'existingnickname';

            userdb.insert({ nickname: newNickname }, function() {
                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: 'anothernewusername', password: HASHED_PASSWORD, newpassword: undefined})
                    .expect(403)
                    .end(function (err) {
                        if (err) throw err;
                        done();
                    });
            });
        });
    });

    describe('update user profile', function() {
        var userdb = db.get('usercollection');

        beforeEach(function(done) {
            userdb.drop(function() {
                userdb.insert({username: USERNAME, nickname: NICKNAME, password: HASHED_PASSWORD}, done);
            });
        });

        describe('current password ok', function() {
            it('all fields are updated (including password))', function(done) {
                var newUsername = 'anotheruser@test.com';
                var newNickname = 'anotheruser';
                var newPassword = 'i68a8ia8aa0aai7';

                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: newUsername, password: HASHED_PASSWORD, newpassword: newPassword})
                    .expect(201)
                    .end(function (err, res) {
                        if (err) throw err;
                        userdb.find({username: newUsername}, function(err, result) {
                            expect(result.length).to.be.above(0);
                            expect(result[0].username).to.equal(newUsername);
                            expect(result[0].nickname).to.equal(newNickname);
                            expect(result[0].password).to.equal(newPassword);

                            done();
                        });
                    });
            });

            it('NO new password, username and nickname are updated (not the password)', function(done) {
                var newUsername = 'anotheruser@test.com';
                var newNickname = 'anotheruser';

                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: newUsername, password: HASHED_PASSWORD, newpassword: undefined})
                    .expect(201)
                    .end(function (err, res) {
                        if (err) throw err;
                        userdb.find({username: newUsername}, function(err, result) {
                            expect(result[0].username).to.equal(newUsername);
                            expect(result[0].nickname).to.equal(newNickname);
                            expect(result[0].password).to.equal(HASHED_PASSWORD);

                            done();
                        });
                    });
            });
        });

        describe('current password NOT ok', function() {
            it('returns error', function() {
                var newUsername = 'anotheruser@test.com';
                var newNickname = 'anotheruser';

                return request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: newUsername, password: 'notgoodhashedpassword', newpassword: undefined})
                    .expect(401);
            });

            it('does not change db', function(done) {
                var newUsername = 'anotheruser@test.com';
                var newNickname = 'anotheruser';

                request
                    .post('/api/user/update')
                    .set('Cookie', setCookie)
                    .send({nickname: newNickname, username: newUsername, password: 'notgoodhashedpassword', newpassword: undefined})
                    .end(function (err, res) {
                        if (err) throw err;
                        userdb.find({username: USERNAME}, function(err, result) {
                            expect(result[0].username).to.equal(USERNAME);
                            expect(result[0].nickname).to.equal(NICKNAME);
                            expect(result[0].password).to.equal(HASHED_PASSWORD);
                            done();
                        });
                    });
            });
        });
    });

    describe('update avatar', function() {
        var SMALL_WIDTH = 60;
        var SMALL_HEIGHT = 60;
        var LARGE_WIDTH = 500;
        var LARGE_HEIGHT = 500;
        var userId;

        beforeEach(function (done) {
            logindb.find({nickname: NICKNAME}, function (err, res) {
                userId = res[0]._id;
                done();
            });
        });

        beforeEach(function (done) {
            request
                .post('/api/user/avatar')
                .set('Cookie', setCookie)
                .attach('avatar', __dirname + '/res/avatar.png')
                .end(function (err, res) {
                    if (err) throw err;
                    done();
                });
        });

        describe('low res', function() {
            it('path', function(done) {
                fs.exists(smallPath(userId), function (exists) {
                    expect(exists).to.be.true;
                    done();
                });
            });

            it('resolution', function(done) {
                gm(smallPath(userId))
                    .size(function (err, size) {
                        expect(size.width).to.be.within(SMALL_WIDTH - 1, SMALL_WIDTH + 1);
                        expect(size.height).to.be.within(SMALL_HEIGHT - 1, SMALL_HEIGHT + 1);
                        done();
                    });
            });

            it('content', function(done) {
                var options = { tolerance: 0 };

                gm.compare(smallPath(userId), __dirname + '/res/small-avatar.jpeg', options,
                    function (err, isEqual) {
                        expect(isEqual).to.be.true;
                        done();
                    });
            });

            it('updates path in db', function(done) {
                userdb.find({nickname: NICKNAME}, function(err, response) {
                    expect(response[0].avatar.small).to.equal('/avatars/' + userId + '-small.jpeg');
                    done();
                });
            });

            it('overwrites previous image', function(done) {
                request
                    .post('/api/user/avatar')
                    .set('Cookie', setCookie)
                    .attach('avatar', __dirname + '/res/avatar2.png')
                    .end(function (err, res) {
                        if (err) throw err;
                        var options = { tolerance: 0 };

                        gm.compare(smallPath(userId), __dirname + '/res/small-avatar2.jpeg', options,
                            function (err, isEqual) {
                                expect(isEqual).to.be.true;
                                done();
                            });
                    });
            });

            function smallPath(string) {
                return __dirname + '/../tmp/avatars/' + string + '-small.jpeg';
            }
        });

        describe('high res', function() {
            it('path', function(done) {
                fs.exists(largePath(userId), function (exists) {
                    expect(exists).to.be.true;
                    done();
                });
            });

            it('resolution', function(done) {
                gm(largePath(userId))
                    .size(function (err, size) {
                        expect(size.width).to.be.within(LARGE_WIDTH - 1, LARGE_WIDTH + 1);
                        expect(size.height).to.be.within(LARGE_HEIGHT - 1, LARGE_HEIGHT + 1);
                        done();
                    });
            });

            it('content', function(done) {
                var options = { tolerance: 0 };

                gm.compare(largePath(userId), __dirname + '/res/large-avatar.jpeg', options,
                    function (err, isEqual) {
                        expect(isEqual).to.be.true;
                        done();
                    });
            });

            it('updates path in db', function(done) {
                userdb.find({nickname: NICKNAME}, function(err, response) {
                    expect(response[0].avatar.large).to.equal('/avatars/' + userId + '-large.jpeg');
                    done();
                });
            });

            it('overwrites previous image', function(done) {
                request
                    .post('/api/user/avatar')
                    .set('Cookie', setCookie)
                    .attach('avatar', __dirname + '/res/avatar2.png')
                    .end(function (err, res) {
                        if (err) throw err;
                        var options = { tolerance: 0 };

                        gm.compare(largePath(userId), __dirname + '/res/large-avatar2.jpeg', options,
                            function (err, isEqual) {
                                expect(isEqual).to.be.true;
                                done();
                            });
                    });
            });

            function largePath(string) {
                return __dirname + '/../tmp/avatars/' + string + '-large.jpeg';
            }
        });

        describe('on success', function() {
            it('deletes temp image', function(done) {
                fs.exists(tmpfilepath, function (exists) {
                    expect(exists).to.be.false;
                    done();
                });
            });

            it('returns 200 when done', function() {
                return request
                    .post('/api/user/avatar')
                    .set('Cookie', setCookie)
                    .attach('avatar', __dirname + '/res/avatar2.png')
                    .expect(200);
            });
        });

        describe('failing if not an image', function() {
            it('deletes temp file', function(done) {
                request
                    .post('/api/user/avatar')
                    .set('Cookie', setCookie)
                    .attach('avatar', __dirname + '/res/notanimage.txt')
                    .end(function (err, res) {
                        fs.exists(tmpfilepath, function (exists) {
                            expect(exists).to.be.false;
                            done();
                        });
                    });
            });

            it('returns failure code', function() {
                return request
                    .post('/api/user/avatar')
                    .set('Cookie', setCookie)
                    .attach('avatar', __dirname + '/res/notanimage.txt')
                    .expect(400);
            });
        });

        afterEach(function () {
            fs.readdir(__dirname + '/../tmp/avatars/', function(err, files) {
                for(var i = 0; i < files.length; i++) {
                    if(files[i] != '.gitignore') {
                        fs.unlinkSync(__dirname + '/../tmp/avatars/' + files[i]);
                    }
                }
            });
        });
    });
});

function nDaysAgo(nDays) {
    var date = new Date();
    clearTime(date);
    date.setDate(date.getDate() - nDays);
    return date;
}

function clearTime(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
}
