require "rails_helper"

RSpec.describe "Admin API", type: :request do
  let!(:owner) { Owner.create!(name: "Demo Owner", timezone: "Europe/Stockholm") }

  def json
    JSON.parse(response.body)
  end

  def json_headers
    { "CONTENT_TYPE" => "application/json" }
  end

  def auth_headers(token)
    json_headers.merge("Authorization" => "Bearer #{token}")
  end

  def local_time(date, time)
    zone = ActiveSupport::TimeZone[owner.timezone]
    hours, minutes = time.split(":").map(&:to_i)
    zone.local(date.year, date.month, date.day, hours, minutes)
  end

  it "logs in and returns an admin token" do
    post "/api/admin/sessions",
      params: { email: "admin@example.com", password: "password" }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:ok)
    expect(json.fetch("token")).to be_present
    expect(json.fetch("expiresAt")).to be_present
  end

  it "rejects admin endpoint access without a token" do
    get "/api/admin/event-types"

    expect(response).to have_http_status(:unauthorized)
    expect(json).to include("error" => "UNAUTHORIZED")
  end

  it "creates, updates and deletes event types with a token" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    post "/api/admin/event-types",
      params: {
        id: "demo-call",
        title: "Demo call",
        description: "Product demo",
        durationMinutes: 45
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(:created)
    expect(json).to include("id" => "demo-call", "durationMinutes" => 45)

    patch "/api/admin/event-types/demo-call",
      params: { title: "Updated demo" }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json).to include("title" => "Updated demo")

    delete "/api/admin/event-types/demo-call", headers: auth_headers(token)

    expect(response).to have_http_status(:no_content)
  end

  it "updates availability rules" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    put "/api/admin/availability-rules",
      params: {
        rules: [
          { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
          { dayOfWeek: 2, startTime: "13:00", endTime: "17:00" }
        ]
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json.size).to eq(2)
    expect(json.first).to include("dayOfWeek" => 1, "startTime" => "10:00", "endTime" => "12:00")
  end

  it "returns the admin profile with a valid token" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    get "/api/admin/profile", headers: auth_headers(token)

    expect(response).to have_http_status(:ok)
    expect(json).to include("name" => "Demo Owner", "timezone" => "Europe/Stockholm")
  end

  it "returns upcoming bookings sorted by startsAt" do
    travel_to(Time.utc(2026, 5, 25, 7, 0, 0)) do
      token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token
      event_type = owner.event_types.create!(slug: "test", title: "Test", description: "Test", duration_minutes: 30)
      later = Time.utc(2026, 5, 26, 8, 0, 0)
      earlier = Time.utc(2026, 5, 25, 8, 0, 0)
      Booking.create!(event_type: event_type, guest_name: "B", guest_email: "b@test.com", starts_at: later, ends_at: later + 30.minutes)
      Booking.create!(event_type: event_type, guest_name: "A", guest_email: "a@test.com", starts_at: earlier, ends_at: earlier + 30.minutes)

      get "/api/admin/bookings/upcoming", headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      expect(json.size).to eq(2)
      expect(json[0]["guestName"]).to eq("A")
      expect(json[1]["guestName"]).to eq("B")
    end
  end

  it "serializes booking times in the calendar owner's timezone" do
    travel_to(Time.utc(2026, 5, 25, 7, 0, 0)) do
      token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token
      event_type = owner.event_types.create!(slug: "consultation", title: "Consultation", description: "Longer call", duration_minutes: 60)
      starts_at = local_time(Date.new(2026, 5, 27), "12:00")
      Booking.create!(
        event_type: event_type,
        guest_name: "Anna",
        guest_email: "anna@example.com",
        starts_at: starts_at,
        ends_at: starts_at + 60.minutes
      )

      get "/api/admin/bookings/upcoming", headers: auth_headers(token)

      expect(response).to have_http_status(:ok)
      expect(json.first).to include(
        "startsAt" => starts_at.iso8601,
        "endsAt" => (starts_at + 60.minutes).iso8601
      )
    end
  end

  it "invalidates the token on logout" do
    session = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now)
    token = session.token

    delete "/api/admin/sessions", headers: auth_headers(token)

    expect(response).to have_http_status(:no_content)
    expect(AdminSession.active.find_by(token: token)).to be_nil
  end

  it "returns 409 conflict when creating a duplicate event type id" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token
    owner.event_types.create!(slug: "existing", title: "Existing", description: "Existing", duration_minutes: 30)

    post "/api/admin/event-types",
      params: {
        id: "existing",
        title: "Duplicate",
        description: "Duplicate",
        durationMinutes: 45
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(:conflict)
    expect(json).to include("error" => "CONFLICT")
  end

  it "rejects event type descriptions longer than 240 characters" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    post "/api/admin/event-types",
      params: {
        id: "long-description",
        title: "Long description",
        description: "x" * 241,
        durationMinutes: 30
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end

  it "rejects event type ids and titles that are too long" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    post "/api/admin/event-types",
      params: {
        id: "a" * 49,
        title: "Valid title",
        description: "Description",
        durationMinutes: 30
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")

    post "/api/admin/event-types",
      params: {
        id: "valid-id",
        title: "T" * 41,
        description: "Description",
        durationMinutes: 30
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end

  it "rejects non-array rules" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    put "/api/admin/availability-rules",
      params: { rules: "not_an_array" }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(:bad_request)
    expect(json).to include("error" => "BAD_REQUEST")
  end

  it "rejects overlapping availability rules" do
    token = AdminSession.create!(token: "valid-token", expires_at: 1.day.from_now).token

    put "/api/admin/availability-rules",
      params: {
        rules: [
          { dayOfWeek: 1, startTime: "10:00", endTime: "12:00" },
          { dayOfWeek: 1, startTime: "11:00", endTime: "13:00" }
        ]
      }.to_json,
      headers: auth_headers(token)

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end
end
