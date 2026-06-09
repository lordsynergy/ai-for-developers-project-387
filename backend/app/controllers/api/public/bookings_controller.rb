module Api
  module Public
    class BookingsController < ApplicationController
      def create
        booking = Bookings::Creator.new(owner: owner, params: booking_params).call

        render json: Serializers::BookingSerializer.call(booking), status: :created
      end

      private

      def booking_params
        params.permit(:eventTypeId, :startAt, :guestName, :guestEmail)
      end
    end
  end
end
