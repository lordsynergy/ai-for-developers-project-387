class FrontendController < ApplicationController
  def index
    response.headers["Cache-Control"] = "no-cache"

    render html: Rails.root.join("public", "index.html").read.html_safe, layout: false
  end
end
