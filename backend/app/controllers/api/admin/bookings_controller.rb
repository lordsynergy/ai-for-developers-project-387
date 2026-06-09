module Api
  module Admin
    class BookingsController < BaseController
      def upcoming
        bookings = Booking.joins(:event_type).merge(owner.event_types).upcoming

        render json: bookings.map { |booking| Serializers::BookingSerializer.call(booking) }
      end
    end
  end
end
