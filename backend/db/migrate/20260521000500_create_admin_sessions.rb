class CreateAdminSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :admin_sessions do |t|
      t.string :token, null: false
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :admin_sessions, :token, unique: true
    add_index :admin_sessions, :expires_at
  end
end
