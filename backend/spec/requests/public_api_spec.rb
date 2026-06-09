require "rails_helper"

RSpec.describe "Public API", type: :request do
  let(:owner) { Owner.create!(name: "Demo Owner", timezone: "Europe/Stockholm") }
  let!(:intro) do
    owner.event_types.create!(
      slug: "intro-call",
      title: "Intro call",
      description: "Short call",
      duration_minutes: 30
    )
  end
  let!(:consultation) do
    owner.event_types.create!(
      slug: "consultation",
      title: "Consultation",
      description: "Longer call",
      duration_minutes: 60
    )
  end

  before do
    (1..5).each do |day|
      owner.availability_rules.create!(day_of_week: day, start_time: "10:00", end_time: "12:00")
    end
  end

  def json
    JSON.parse(response.body)
  end

  def json_headers
    { "CONTENT_TYPE" => "application/json" }
  end

  def local_time(date, time)
    zone = ActiveSupport::TimeZone[owner.timezone]
    hours, minutes = time.split(":").map(&:to_i)
    zone.local(date.year, date.month, date.day, hours, minutes)
  end

  around do |example|
    travel_to(Time.utc(2026, 5, 25, 7, 0, 0)) { example.run }
  end

  it "returns public event types" do
    get "/api/public/event-types"

    expect(response).to have_http_status(:ok)
    expect(json).to include(
      hash_including(
        "id" => "intro-call",
        "title" => "Intro call",
        "description" => "Short call",
        "durationMinutes" => 30
      )
    )
  end

  it "returns available slots for an event type" do
    get "/api/public/event-types/intro-call/slots"

    expect(response).to have_http_status(:ok)
    expect(json.first).to include(
      "eventTypeId" => "intro-call",
      "durationMinutes" => 30
    )
    expect(json.map { |slot| slot["startAt"] }).to include(local_time(Date.new(2026, 5, 25), "10:00").iso8601)
  end

  it "creates a booking and removes that slot from availability" do
    get "/api/public/event-types/intro-call/slots"
    start_at = json.first.fetch("startAt")

    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: start_at,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:created)
    expect(json).to include(
      "eventTypeId" => "intro-call",
      "guestName" => "Anna",
      "guestEmail" => "anna@example.com"
    )

    get "/api/public/event-types/intro-call/slots"

    expect(json.map { |slot| slot["startAt"] }).not_to include(start_at)
  end

  it "does not return slots that partially overlap existing bookings" do
    owner.availability_rules.delete_all
    owner.availability_rules.create!(day_of_week: 3, start_time: "10:00", end_time: "18:00")
    demo = owner.event_types.create!(
      slug: "demo-call",
      title: "Demo call",
      description: "Demo",
      duration_minutes: 45
    )
    starts_at = local_time(Date.new(2026, 5, 27), "13:15")
    Booking.create!(
      event_type: demo,
      guest_name: "Existing",
      guest_email: "existing@example.com",
      starts_at: starts_at,
      ends_at: starts_at + 45.minutes
    )

    get "/api/public/event-types/consultation/slots"

    expect(response).to have_http_status(:ok)
    expect(json.map { |slot| slot["startAt"] }).not_to include(local_time(Date.new(2026, 5, 27), "13:00").iso8601)
    expect(json.map { |slot| slot["startAt"] }).to include(local_time(Date.new(2026, 5, 27), "14:00").iso8601)
  end

  it "rejects booking the same slot twice" do
    start_at = local_time(Date.new(2026, 5, 25), "10:00")
    Booking.create!(
      event_type: intro,
      guest_name: "Existing",
      guest_email: "existing@example.com",
      starts_at: start_at,
      ends_at: start_at + 30.minutes
    )

    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: start_at.iso8601,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:conflict)
    expect(json).to include("error" => "CONFLICT")
  end

  it "rejects overlapping bookings across event types" do
    start_at = local_time(Date.new(2026, 5, 25), "10:00")
    Booking.create!(
      event_type: consultation,
      guest_name: "Existing",
      guest_email: "existing@example.com",
      starts_at: start_at,
      ends_at: start_at + 60.minutes
    )

    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "10:30").iso8601,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(:conflict)
  end

  it "rejects booking outside working hours" do
    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "09:00").iso8601,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end

  it "rejects booking with startAt not aligned to slot grid" do
    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "10:15").iso8601,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end

  it "rejects booking with fractional seconds in startAt" do
    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "10:00").change(usec: 500_000).iso8601(3),
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end

  it "rejects booking outside the 14 day window" do
    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 6, 9), "10:00").iso8601,
        guestName: "Anna",
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
  end

  it "rejects booking with guest data that is too long" do
    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "10:00").iso8601,
        guestName: "A" * 61,
        guestEmail: "anna@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")

    post "/api/public/bookings",
      params: {
        eventTypeId: "intro-call",
        startAt: local_time(Date.new(2026, 5, 25), "10:00").iso8601,
        guestName: "Anna",
        guestEmail: "#{'a' * 109}@example.com"
      }.to_json,
      headers: json_headers

    expect(response).to have_http_status(422)
    expect(json).to include("error" => "VALIDATION_ERROR")
  end
end
