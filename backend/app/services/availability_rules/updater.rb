module AvailabilityRules
  class Updater
    def initialize(owner:, rules:)
      @owner = owner
      @rules = Array(rules)
    end

    def call
      normalized_rules = normalize_rules
      validate_no_overlaps!(normalized_rules)

      AvailabilityRule.transaction do
        owner.availability_rules.delete_all
        normalized_rules.map { |attributes| owner.availability_rules.create!(attributes) }
      end
    rescue ActiveRecord::RecordInvalid => e
      raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Проверьте правила рабочего времени")
    end

    private

    attr_reader :owner, :rules

    def normalize_rules
      rules.map do |rule|
        {
          day_of_week: rule.fetch(:dayOfWeek),
          start_time: rule.fetch(:startTime),
          end_time: rule.fetch(:endTime)
        }
      end
    rescue KeyError
      raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Правило должно содержать день, начало и конец")
    rescue NoMethodError
      raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Правила должны быть списком объектов")
    end

    def validate_no_overlaps!(normalized_rules)
      normalized_rules.group_by { |rule| rule[:day_of_week] }.each_value do |day_rules|
        sorted = day_rules.sort_by { |rule| AvailabilityRule.minutes_for(rule[:start_time]) }

        sorted.each_cons(2) do |left, right|
          next if AvailabilityRule.minutes_for(left[:end_time]) <= AvailabilityRule.minutes_for(right[:start_time])

          raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Правила рабочего времени не должны пересекаться")
        end
      end
    rescue NoMethodError
      raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Правила рабочего времени должны быть массивом")
    end
  end
end
