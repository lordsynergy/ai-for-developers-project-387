require "digest"

module Api
  module Admin
    class SessionsController < ApplicationController
      def create
        unless valid_credentials?
          raise ApiError.new(status: :unauthorized, code: "UNAUTHORIZED", message: "Неверный email или пароль")
        end

        session = AdminSession.create!(
          token: SecureRandom.hex(32),
          expires_at: 7.days.from_now
        )

        render json: { token: session.token, expiresAt: session.expires_at.iso8601 }
      end

      def destroy
        token = request.authorization.to_s.match(/\ABearer (.+)\z/)&.captures&.first
        session = AdminSession.active.find_by(token: token)
        raise ApiError.new(status: :unauthorized, code: "UNAUTHORIZED", message: "Нужен действующий токен администратора") unless session

        session.destroy!
        head :no_content
      end

      private

      def valid_credentials?
        secure_compare(params[:email].to_s, admin_email) && secure_compare(params[:password].to_s, admin_password)
      end

      def secure_compare(value, expected)
        ActiveSupport::SecurityUtils.secure_compare(
          Digest::SHA256.hexdigest(value),
          Digest::SHA256.hexdigest(expected)
        )
      end

      def admin_email
        ENV.fetch("ADMIN_EMAIL", "admin@example.com")
      end

      def admin_password
        ENV.fetch("ADMIN_PASSWORD", "password")
      end
    end
  end
end
