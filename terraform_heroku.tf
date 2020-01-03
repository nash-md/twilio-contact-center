variable "heroku" {
  type = map
  default = {
    email = ""
    api_key = ""
  }
}

variable "twilio" {
  type = map
  default = {
    account_sid = ""
    auth_token = ""
    workspace_sid = ""
    chat_service_sid = ""
    api_key_sid = ""
    api_key_secret = ""
  }
}

provider "heroku" {
  email = var.heroku.email
  api_key = var.heroku.api_key
}

resource "heroku_app" "default" {
  name = "<your_application_name>"
  region = "eu"
  sensitive_config_vars = {
    TWILIO_ACCOUNT_SID = var.twilio.account_sid
    TWILIO_AUTH_TOKEN = var.twilio.auth_token
    TWILIO_WORKSPACE_SID = var.twilio.workspace_sid
    TWILIO_CHAT_SERVICE_SID = var.twilio.chat_service_sid
    TWILIO_API_KEY_SID = var.twilio.api_key_sid
    TWILIO_API_KEY_SECRET = var.twilio.api_key_secret
  }
}

resource "heroku_addon" "database" {
  app = heroku_app.default.name
  plan = "heroku-postgresql:hobby-basic"
}

resource "heroku_build" "contact_center" {
  app = heroku_app.default.id
  source = {
    url = "https://github.com/nash-md/twilio-contact-center/tarball/master"
  }
}