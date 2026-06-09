class CreateBookings < ActiveRecord::Migration[8.1]
  def change
    create_table :bookings do |t|
      t.references :event_type, null: false, foreign_key: true
      t.string :guest_name, null: false
      t.string :guest_email, null: false
      t.datetime :starts_at, null: false
      t.datetime :ends_at, null: false

      t.timestamps
    end

    add_index :bookings, :starts_at
    add_index :bookings, :ends_at
  end
end
