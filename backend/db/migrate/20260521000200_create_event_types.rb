class CreateEventTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :event_types do |t|
      t.references :owner, null: false, foreign_key: true
      t.string :slug, null: false
      t.string :title, null: false
      t.text :description, null: false, default: ""
      t.integer :duration_minutes, null: false

      t.timestamps
    end

    add_index :event_types, [:owner_id, :slug], unique: true
  end
end
