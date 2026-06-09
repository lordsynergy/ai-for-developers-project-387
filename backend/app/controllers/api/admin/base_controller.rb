module Api
  module Admin
    class BaseController < ApplicationController
      before_action :authenticate_admin!

      private

      def authenticate_admin!
        token = request.authorization.to_s.match(/\ABearer (.+)\z/)&.captures&.first
        @admin_session = AdminSession.active.find_by(token: token)

        return if @admin_session

        raise ApiError.new(status: :unauthorized, code: "UNAUTHORIZED", message: "Нужен действующий токен администратора")
      end
    end
  end
end
