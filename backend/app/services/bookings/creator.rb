module Bookings
  class Creator
    def initialize(owner:, params:)
      @owner = owner
      @params = params
    end

    def call
      validate_guest!
      event_type = find_event_type!
      starts_at = parse_start_at!
      checker = AvailabilityChecker.new(owner: owner, event_type: event_type, starts_at: starts_at)

      raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Выбранное время недоступно для записи") unless checker.valid_slot?
      raise ApiError.new(status: :conflict, code: "CONFLICT", message: "Выбранное время уже занято") if checker.booked?

      Booking.create!(
        event_type: event_type,
        guest_name: params.fetch(:guestName).to_s.strip,
        guest_email: params.fetch(:guestEmail).to_s.strip,
        starts_at: starts_at,
        ends_at: checker.ends_at
      )
    rescue ActiveRecord::RecordInvalid => e
      raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Проверьте данные гостя")
    end

    private

    attr_reader :owner, :params

    def validate_guest!
      if params[:guestName].blank? || params[:guestEmail].blank?
        raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Укажите имя и email гостя")
      end

      if params[:guestName].to_s.strip.length > 60
        raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Имя должно быть не длиннее 60 символов")
      end

      if params[:guestEmail].to_s.strip.length > 120
        raise ApiError.new(status: 422, code: "VALIDATION_ERROR", message: "Email должен быть не длиннее 120 символов")
      end

      return if params[:guestEmail].to_s.match?(URI::MailTo::EMAIL_REGEXP)

      raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Укажите корректный email")
    end

    def find_event_type!
      event_type = owner.event_types.find_by(slug: params[:eventTypeId])
      return event_type if event_type

      raise ApiError.new(status: :not_found, code: "NOT_FOUND", message: "Тип встречи не найден")
    end

    def parse_start_at!
      Time.iso8601(params.fetch(:startAt).to_s)
    rescue ArgumentError, KeyError
      raise ApiError.new(status: :bad_request, code: "BAD_REQUEST", message: "Передайте дату и время в корректном ISO 8601 формате")
    end
  end
end
