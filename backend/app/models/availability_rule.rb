class AvailabilityRule < ApplicationRecord
  TIME_PATTERN = /\A([01]\d|2[0-3]):([0-5]\d)\z/

  belongs_to :owner

  validates :day_of_week, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 7 }
  validates :start_time, :end_time, presence: true, format: { with: TIME_PATTERN }
  validate :start_time_before_end_time

  def start_minutes
    self.class.minutes_for(start_time)
  end

  def end_minutes
    self.class.minutes_for(end_time)
  end

  def self.minutes_for(value)
    hours, minutes = value.split(":").map(&:to_i)
    (hours * 60) + minutes
  end

  private

  def start_time_before_end_time
    return if start_time.blank? || end_time.blank?
    return unless start_time.match?(TIME_PATTERN) && end_time.match?(TIME_PATTERN)

    errors.add(:start_time, "must be before endTime") if start_minutes >= end_minutes
  end
end
