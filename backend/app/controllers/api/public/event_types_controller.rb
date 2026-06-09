module Api
  module Public
    class EventTypesController < ApplicationController
      def index
        render json: owner.event_types.order(:created_at).map { |event_type| Serializers::EventTypeSerializer.call(event_type) }
      end

      def slots
        event_type = owner.event_types.find_by!(slug: params[:event_type_id])
        slots = Slots::Calculator.new(owner: owner, event_type: event_type).call

        render json: slots.map(&:as_json)
      end
    end
  end
end
