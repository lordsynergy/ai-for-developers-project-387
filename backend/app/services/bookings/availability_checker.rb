module Bookings
  class AvailabilityChecker
    BOOKING_WINDOW_DAYS = Slots::Calculator::BOOKING_WINDOW_DAYS

    def initialize(owner:, event_type:, starts_at:, now: Time.current)
      @owner = owner
      @event_type = event_type
      @starts_at = starts_at
      @ends_at = starts_at + event_type.duration_minutes.minutes
      @now = now
      @zone = ActiveSupport::TimeZone[owner.timezone] || Time.zone
    end

    attr_reader :ends_at

    def valid_slot?
      in_booking_window? && in_future? && matching_availability_rule?
    end

    def booked?
      Booking.overlapping(starts_at, ends_at).exists?
    end

    private

    attr_reader :owner, :event_type, :starts_at, :now, :zone

    def in_future?
      starts_at >= now
    end

    def in_booking_window?
      local_date = starts_at.in_time_zone(zone).to_date
      today = now.in_time_zone(zone).to_date

      local_date >= today && local_date < today + BOOKING_WINDOW_DAYS
    end

    def matching_availability_rule?
      local_start = starts_at.in_time_zone(zone)
      local_end = ends_at.in_time_zone(zone)
      return false unless local_start.to_date == local_end.to_date

      owner.availability_rules.where(day_of_week: local_start.to_date.cwday).any? do |rule|
        aligned_to_rule?(rule, local_start, local_end)
      end
    end

    def aligned_to_rule?(rule, local_start, local_end)
      start_minutes = (local_start.hour * 60) + local_start.min
      end_minutes = (local_end.hour * 60) + local_end.min

      return false unless local_start.sec.zero? &&
        local_end.sec.zero? &&
        local_start.usec.zero? &&
        local_end.usec.zero?

      start_minutes >= rule.start_minutes &&
        end_minutes <= rule.end_minutes &&
        ((start_minutes - rule.start_minutes) % event_type.duration_minutes).zero?
    end
  end
end
