class CreateOwners < ActiveRecord::Migration[8.1]
  def change
    create_table :owners do |t|
      t.string :name, null: false
      t.string :timezone, null: false

      t.timestamps
    end
  end
end
