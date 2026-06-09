module Slots
  Slot = Struct.new(:event_type_id, :start_at, :end_at, :duration_minutes, keyword_init: true) do
    def as_json(*)
      {
        eventTypeId: event_type_id,
        startAt: start_at.iso8601,
        endAt: end_at.iso8601,
        durationMinutes: duration_minutes
      }
    end
  end

  class Calculator
    BOOKING_WINDOW_DAYS = 14

    def initialize(owner:, event_type:, now: Time.current)
      @owner = owner
      @event_type = event_type
      @now = now
      @zone = ActiveSupport::TimeZone[owner.timezone] || Time.zone
    end

    def call
      rules = owner.availability_rules.order(:day_of_week, :start_time).group_by(&:day_of_week)

      booking_dates.flat_map do |date|
        day_rules = rules.fetch(day_of_week(date), [])
        day_rules.flat_map { |rule| slots_for_rule(date, rule) }
      end
    end

    private

    attr_reader :owner, :event_type, :now, :zone

    def booking_dates
      today = now.in_time_zone(zone).to_date
      (0...BOOKING_WINDOW_DAYS).map { |offset| today + offset }
    end

    def day_of_week(date)
      date.cwday
    end

    def slots_for_rule(date, rule)
      start_at = local_time(date, rule.start_time)
      rule_end = local_time(date, rule.end_time)
      slots = []

      while start_at + event_type.duration_minutes.minutes <= rule_end
        end_at = start_at + event_type.duration_minutes.minutes
        slots << build_slot(start_at, end_at) if start_at >= now && !booked?(start_at, end_at)
        start_at = end_at
      end

      slots
    end

    def local_time(date, time_string)
      hours, minutes = time_string.split(":").map(&:to_i)
      zone.local(date.year, date.month, date.day, hours, minutes)
    end

    def booked?(start_at, end_at)
      Booking.overlapping(start_at, end_at).exists?
    end

    def build_slot(start_at, end_at)
      Slot.new(
        event_type_id: event_type.slug,
        start_at: start_at,
        end_at: end_at,
        duration_minutes: event_type.duration_minutes
      )
    end
  end
end
