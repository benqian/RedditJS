define(['jquery', 'underscore', 'backbone', 'resthub', 'hbs!template/login-popup', 'view/login-view', 'model/user-about', 'event/channel', 'cookie'],
	function($, _, Backbone, Resthub, LoginPopupTmpl, LoginView, UserModel, channel, cookie) {
		var LoginPopupView = LoginView.extend({
			el: "#popupWindow",
			events: {
				'submit #login_reg': 'register',
				'click .capimage': 'getNewCaptcha',
				'click .hidecover': 'hide',
				'submit #login_login': 'doLogin',
			},

			initialize: function(data) {
				_.bindAll(this);
				this.template = LoginPopupTmpl;

				this.render()
				this.getNewCaptcha()
				this.$el.show() //it sometimes could be hidden

				channel.on("login", this.gotoHomeAfterLogin, this);
			},

			doLogin: function(e) {
				e.preventDefault()
				e.stopPropagation()
				this.login()

			},
			hide: function() {
				this.$el.hide()
			},
			getNewCaptcha: function() {
				var self = this
				var params = {
					api_type: 'json',
					byPassAuth: true

				};

				this.api("api/new_captcha", 'POST', params, function(data) {
					console.log("got a captcha done", data)
					if (typeof data !== 'undefined' && typeof data.json !== 'undefined' && typeof data.json.data !== 'undefined' && typeof data.json.data.iden !== 'undefined') {
						self.iden = data.json.data.iden
						//load the captcha into the image box
						self.displayCaptcha(self.iden)
					} else {
						console.log('unable to get an iden for the captcha')
						self.$('.capimage').attr("src", 'img/sad-icon.png');
					}
				});
			},
			displayCaptcha: function(iden) {
				this.$('.capimage').attr("src", 'http://www.reddit.com/captcha/' + iden + '.png');
			},
			register: function(e) {
				e.preventDefault()
				e.stopPropagation()
				var user_reg = this.$('#user_reg').val()
				var email_reg = this.$('#email_reg').val()
				var passwd_reg = this.$('#passwd_reg').val()
				var passwd2_reg = this.$('#passwd2_reg').val()
				var cap_text = this.$('.cap-text').val()
				var rem_reg = this.$('#rem_reg').is(':checked')

				if (user_reg.length < 4) {
					this.$('.error').html('Please make a longer username')
					return;
				}

				if (passwd_reg.length < 6) {
					this.$('.error').html('Please make a password at least 6 characters long')
					return;
				}

				if (passwd_reg != passwd2_reg) {
					this.$('.error').html('Passwords do not match')
					return;
				}

				var self = this
				var params = {
					api_type: 'json',
					byPassAuth: true, //tells our internal api to not check for logged in user
					captcha: cap_text,
					passwd: passwd_reg,
					passwd2: passwd2_reg,
					rem: rem_reg,
					iden: self.iden,
					user: user_reg
				};
				console.log(params)

				this.api("api/register", 'POST', params, function(data) {
					console.log("register done", data)
					if (typeof data !== 'undefined' && typeof data.json !== 'undefined') {
						if (typeof data.json.captcha !== 'undefined' || data.json.errors.length > 0) {
							console.log('unable to register')
							this.$('.error').html(data.json.errors[0][1])
							if (typeof data.json.captcha !== 'undefined') {
								self.iden = data.json.captcha
								//load the captcha into the image box
								self.displayCaptcha(self.iden)
							}
						} else if (typeof data.json.data !== 'undefined') {
							console.log('it worked, the user is registered')
							//load the captcha into the image box
							var loginData = data.json.data;
							console.log(loginData)
							window.me = loginData
							self.setLoginCookies(loginData.cookie, loginData.modhash, user)
							self.gotoHomeAfterLogin()
						}
					}
				});

			},
			gotoHomeAfterLogin: function() {
				var self = this

				//check if user has reddit gold first
				this.me = new UserModel($.cookie('username'));
				this.me.fetch({
					async: false,
					success: function(data) {
						console.log('my info=', data)
						console.log('isgold=', data.get('is_gold'))
						if (data.get('is_gold') == true) {
							var curHash = Backbone.history.fragment
							Backbone.history.navigate('redirectAfterLogin'); //have to redirect to a fake link before we goback to where the user wants to go
							Backbone.history.navigate(curHash, {
								trigger: true

							})
							self.remove()
						} else {
							self.$el.show()
							self.logout()
							self.$('.loginError').html('redditJS is for reddit gold users only.').show()
						}
					}
				})

			},

		});
		return LoginPopupView;
	});