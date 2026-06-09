module Api
  module Admin
    class ProfilesController < BaseController
      def show
        render json: Serializers::OwnerSerializer.call(owner)
      end
    end
  end
end
