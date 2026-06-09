module Serializers
  class EventTypeSerializer
    def self.call(event_type)
      {
        id: event_type.slug,
        title: event_type.title,
        description: event_type.description,
        durationMinutes: event_type.duration_minutes
      }
    end
  end
end
