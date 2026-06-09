module Serializers
  class AvailabilityRuleSerializer
    def self.call(rule)
      {
        id: rule.id.to_s,
        dayOfWeek: rule.day_of_week,
        startTime: rule.start_time,
        endTime: rule.end_time
      }
    end
  end
end
