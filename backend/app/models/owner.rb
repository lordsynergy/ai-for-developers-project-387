class Owner < ApplicationRecord
  has_many :event_types, dependent: :destroy
  has_many :availability_rules, dependent: :destroy

  validates :name, presence: true
  validates :timezone, presence: true

  def self.calendar
    first!
  end
end
