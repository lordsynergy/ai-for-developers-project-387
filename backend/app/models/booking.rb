class Booking < ApplicationRecord
  belongs_to :event_type

  validates :guest_name, presence: true, length: { maximum: 60 }
  validates :guest_email, presence: true, length: { maximum: 120 }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :starts_at, :ends_at, presence: true
  validate :ends_after_start

  scope :upcoming, -> { where("starts_at >= ?", Time.current).order(:starts_at) }
  scope :overlapping, ->(starts_at, ends_at) { where("starts_at < ? AND ends_at > ?", ends_at, starts_at) }

  private

  def ends_after_start
    return if starts_at.blank? || ends_at.blank?

    errors.add(:ends_at, "must be after startsAt") unless ends_at > starts_at
  end
end
