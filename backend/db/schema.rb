# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_21_000500) do
  create_table "admin_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_admin_sessions_on_expires_at"
    t.index ["token"], name: "index_admin_sessions_on_token", unique: true
  end

  create_table "availability_rules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_of_week", null: false
    t.string "end_time", null: false
    t.integer "owner_id", null: false
    t.string "start_time", null: false
    t.datetime "updated_at", null: false
    t.index ["owner_id", "day_of_week"], name: "index_availability_rules_on_owner_id_and_day_of_week"
    t.index ["owner_id"], name: "index_availability_rules_on_owner_id"
  end

  create_table "bookings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "ends_at", null: false
    t.integer "event_type_id", null: false
    t.string "guest_email", null: false
    t.string "guest_name", null: false
    t.datetime "starts_at", null: false
    t.datetime "updated_at", null: false
    t.index ["ends_at"], name: "index_bookings_on_ends_at"
    t.index ["event_type_id"], name: "index_bookings_on_event_type_id"
    t.index ["starts_at"], name: "index_bookings_on_starts_at"
  end

  create_table "event_types", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description", default: "", null: false
    t.integer "duration_minutes", null: false
    t.integer "owner_id", null: false
    t.string "slug", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["owner_id", "slug"], name: "index_event_types_on_owner_id_and_slug", unique: true
    t.index ["owner_id"], name: "index_event_types_on_owner_id"
  end

  create_table "owners", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "timezone", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "availability_rules", "owners"
  add_foreign_key "bookings", "event_types"
  add_foreign_key "event_types", "owners"
end
