class CreateAvailabilityRules < ActiveRecord::Migration[8.1]
  def change
    create_table :availability_rules do |t|
      t.references :owner, null: false, foreign_key: true
      t.integer :day_of_week, null: false
      t.string :start_time, null: false
      t.string :end_time, null: false

      t.timestamps
    end

    add_index :availability_rules, [:owner_id, :day_of_week]
  end
end
