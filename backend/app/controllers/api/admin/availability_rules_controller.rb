module Api
  module Admin
    class AvailabilityRulesController < BaseController
      def index
        render json: serialized_rules
      end

      def update
        rules = params.require(:rules)
        raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Правила рабочего времени должны быть массивом") unless rules.is_a?(Array)

        AvailabilityRules::Updater.new(owner: owner, rules: rules).call

        render json: serialized_rules
      end

      private

      def serialized_rules
        owner.availability_rules.order(:day_of_week, :start_time).map { |rule| Serializers::AvailabilityRuleSerializer.call(rule) }
      end
    end
  end
end
