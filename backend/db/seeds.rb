owner = Owner.first_or_create!(
  name: "Demo Owner",
  timezone: "Europe/Stockholm"
)

[
  {
    slug: "intro-call",
    title: "Intro call",
    description: "Short introductory call to discuss the request and next steps.",
    duration_minutes: 30
  },
  {
    slug: "consultation",
    title: "Consultation",
    description: "A deeper consultation with time for questions and planning.",
    duration_minutes: 60
  },
  {
    slug: "demo-call",
    title: "Demo call",
    description: "Product or solution demo with follow-up discussion.",
    duration_minutes: 45
  }
].each do |attributes|
  owner.event_types.find_or_initialize_by(slug: attributes[:slug]).tap do |event_type|
    event_type.update!(attributes)
  end
end

AvailabilityRule.where(owner: owner).delete_all
(1..5).each do |day_of_week|
  owner.availability_rules.create!(
    day_of_week: day_of_week,
    start_time: "10:00",
    end_time: "18:00"
  )
end
