class EventType < ApplicationRecord
  belongs_to :owner
  has_many :bookings, dependent: :destroy

  validates :slug, presence: true, length: { maximum: 48 }, format: { with: /\A[a-z0-9-]+\z/ }, uniqueness: { scope: :owner_id }
  validates :title, presence: true, length: { maximum: 40 }
  validates :description, length: { maximum: 240 }
  validates :duration_minutes, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 480 }
end
