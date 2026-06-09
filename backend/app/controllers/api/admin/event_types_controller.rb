module Api
  module Admin
    class EventTypesController < BaseController
      def index
        render json: owner.event_types.order(:created_at).map { |event_type| Serializers::EventTypeSerializer.call(event_type) }
      end

      def create
        if owner.event_types.exists?(slug: params.require(:id))
          render_error(:conflict, "CONFLICT", "Тип встречи с таким ID уже существует")
          return
        end

        event_type = owner.event_types.new(event_type_create_params)
        event_type.slug = params.require(:id)
        event_type.save!

        render json: Serializers::EventTypeSerializer.call(event_type), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render_model_error(e.record)
      end

      def update
        event_type = owner.event_types.find_by!(slug: params[:event_type_id])
        event_type.update!(event_type_update_params)

        render json: Serializers::EventTypeSerializer.call(event_type)
      rescue ActiveRecord::RecordInvalid => e
        render_model_error(e.record)
      end

      def destroy
        owner.event_types.find_by!(slug: params[:event_type_id]).destroy!

        head :no_content
      end

      private

      def event_type_create_params
        {
          title: params.require(:title),
          description: params.require(:description),
          duration_minutes: params.require(:durationMinutes)
        }
      end

      def event_type_update_params
        permitted = params.permit(:title, :description, :durationMinutes)
        {}.tap do |attributes|
          attributes[:title] = permitted[:title] if permitted.key?(:title)
          attributes[:description] = permitted[:description] if permitted.key?(:description)
          attributes[:duration_minutes] = permitted[:durationMinutes] if permitted.key?(:durationMinutes)
        end
      end

      def render_model_error(record)
        render_error(422, "VALIDATION_ERROR", "Проверьте поля типа встречи")
      end
    end
  end
end
